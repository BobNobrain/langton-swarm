import { absurd } from '@/lib/errors';
import type { UnitCommand } from '../types';
import type {
    BsmlArgument,
    BsmlAssignmentInstruction,
    BsmlCommandDeclaration,
    BsmlConditonalInstruction,
    BsmlEventListener,
    BsmlExpression,
    BsmlFunctionCall,
    BsmlInstruction,
    BsmlProgram,
    BsmlSetStateInstruction,
    BsmlStateDeclaration,
    BsmlWhileLoopInstruction,
    CodePosition,
} from './program';
import type { BsmlValue } from './value';
import { extractCommands, getCommandStateName } from './utils';

export type CompiledInstruction =
    | { type: 'push'; value: BsmlValue }
    | { type: 'pop' }
    | { type: 'call'; fname: string; nargs: number }
    | { type: 'assign'; memptr: number; debugVarName: string }
    | { type: 'read'; memptr: number; debugVarName: string }
    | { type: 'binop'; operator: string }
    | { type: 'unop'; operator: string }
    | { type: 'setstate'; nargs: number }
    | { type: 'jump'; position: number }
    | { type: 'jumpz'; position: number }
    | { type: 'ret' };

export type CompiledProgram = {
    instructions: CompiledInstruction[];
    stateStarts: Record<string, number>;
    eventStarts: Record<string, number>;
    defaultState: string;
    stateArgNames: Record<string, string[]>;
    sourcemap: CodePosition[];
    commands: UnitCommand[];
};

class InstructionWriter {
    readonly start: number;
    private instructions: CompiledInstruction[];
    private sourcemap: CodePosition[];
    private memIdx: number;
    private scopeStack: { vars: string[]; nameToMemPtr: Record<string, number> }[] = [];

    constructor(result: CompiledProgram) {
        this.instructions = result.instructions;
        this.sourcemap = result.sourcemap;
        this.start = result.instructions.length;
        this.memIdx = 0;
    }

    write(instruction: CompiledInstruction, codePos: CodePosition) {
        this.instructions.push(instruction);
        this.sourcemap.push(codePos);
    }
    length() {
        return this.instructions.length;
    }

    createVar(varname: string): number {
        const last = this.scopeStack[this.scopeStack.length - 1];
        const memPtr = this.memIdx++;
        last.vars.push(varname);
        last.nameToMemPtr[varname] = memPtr;
        return memPtr;
    }
    getVar(varname: string): number {
        for (let scopeIndex = this.scopeStack.length - 1; scopeIndex >= 0; scopeIndex--) {
            const scope = this.scopeStack[scopeIndex];
            const memPtr = scope.nameToMemPtr[varname];
            if (memPtr !== undefined) {
                return memPtr;
            }
        }

        return -1;
    }
    pushScope() {
        this.scopeStack.push({ vars: [], nameToMemPtr: {} });
    }
    popScope() {
        const last = this.scopeStack.pop()!;
        this.memIdx -= last.vars.length;
    }

    pushScopeWithArgs(args: BsmlArgument[]) {
        this.pushScope();
        for (const arg of args) {
            this.createVar(arg.name);
        }
    }
}

export function compile(program: BsmlProgram): CompiledProgram {
    const result: CompiledProgram = {
        instructions: [],
        stateStarts: {
            idle: -1,
            error: -1,
        },
        eventStarts: {},
        defaultState: 'idle',
        stateArgNames: {},
        sourcemap: [],
        commands: extractCommands(program),
    };

    for (const stateDecl of program.stateDeclarations) {
        if (stateDecl.isDefault) {
            result.defaultState = stateDecl.name;
        }

        result.stateArgNames[stateDecl.name] = stateDecl.args.map((arg) => arg.name);

        const w = new InstructionWriter(result);
        w.pushScopeWithArgs(stateDecl.args);
        compileCommandBlock(stateDecl.body, w);
        w.write({ type: 'jump', position: w.start }, Sourcemap.locateDeclarationEnd(stateDecl));

        result.stateStarts[stateDecl.name] = w.start;
    }

    for (const cmdDecl of program.commandDeclarations) {
        const cmdStateName = getCommandStateName(cmdDecl.name);
        const w = new InstructionWriter(result);
        w.pushScopeWithArgs(cmdDecl.args);

        compileCommandBlock(cmdDecl.body, w);

        // implicit return to :idle after the command has been finished
        w.write({ type: 'push', value: { type: 'state', value: 'idle' } }, Sourcemap.locateDeclarationEnd(cmdDecl));
        w.write({ type: 'setstate', nargs: 0 }, Sourcemap.locateDeclarationEnd(cmdDecl));

        result.stateStarts[cmdStateName] = w.start;
    }

    for (const evtDecl of program.eventListeners) {
        const w = new InstructionWriter(result);
        compileCommandBlock(evtDecl.body, w);

        w.write({ type: 'ret' }, Sourcemap.locateDeclarationEnd(evtDecl));

        result.eventStarts[evtDecl.event] = w.start;
    }

    return result;
}

function compileCommandBlock(cmds: BsmlInstruction[], writer: InstructionWriter) {
    writer.pushScope();
    for (const cmd of cmds) {
        switch (cmd.type) {
            case 'assign':
                compileExpression(cmd.value, writer);
                writer.write(
                    { type: 'assign', memptr: writer.createVar(cmd.variable), debugVarName: cmd.variable },
                    Sourcemap.locateAssignStmt(cmd),
                );
                break;

            case 'branch': {
                compileExpression(cmd.condition, writer);
                const jump = { type: 'jumpz', position: -1 } satisfies CompiledInstruction;
                writer.write(jump, Sourcemap.locateIfStmt(cmd));
                compileCommandBlock(cmd.body, writer);
                jump.position = writer.length();
                break;
            }

            case 'set_state':
                compileExpression(cmd.state, writer);
                for (const argExpr of cmd.args) {
                    compileExpression(argExpr, writer);
                }
                writer.write({ type: 'setstate', nargs: cmd.args.length }, Sourcemap.locateSetStateStmt(cmd));
                break;

            case 'call':
                for (const argExpr of cmd.args) {
                    compileExpression(argExpr, writer);
                }
                writer.write(
                    { type: 'call', fname: cmd.name, nargs: cmd.args.length },
                    Sourcemap.locateFunctionCall(cmd),
                );
                writer.write({ type: 'pop' }, Sourcemap.locateFunctionCall(cmd)); // this call is a command, meaning its result should be ignored
                break;

            case 'while': {
                if (cmd.isPostfix) {
                    // loop { body } while condition
                    const jumpzToExit = { type: 'jumpz', position: -1 } satisfies CompiledInstruction;
                    const jumpToStart: CompiledInstruction = { type: 'jump', position: writer.length() };

                    compileCommandBlock(cmd.body, writer);

                    if (cmd.condition) {
                        compileExpression(cmd.condition, writer);
                        writer.write(jumpzToExit, Sourcemap.locateLoopStmt(cmd));
                    }

                    writer.write(jumpToStart, Sourcemap.locateLoopStmt(cmd));
                    jumpzToExit.position = writer.length();
                } else {
                    // loop while condition { body }
                    const jumpzToExit = { type: 'jumpz', position: -1 } satisfies CompiledInstruction;
                    const jumpToStart: CompiledInstruction = { type: 'jump', position: writer.length() };

                    if (cmd.condition) {
                        compileExpression(cmd.condition, writer);
                        writer.write(jumpzToExit, Sourcemap.locateLoopStmt(cmd));
                    }

                    compileCommandBlock(cmd.body, writer);
                    writer.write(jumpToStart, Sourcemap.locateLoopStmt(cmd));

                    jumpzToExit.position = writer.length();
                }

                break;
            }

            case 'control':
                // TODO: somehow implement break/continue jumps
                throw new Error('not implemented yet');

            default:
                return absurd(cmd);
        }
    }
    writer.popScope();
}

function compileExpression(expr: BsmlExpression, writer: InstructionWriter) {
    switch (expr.type) {
        case 'bool':
            writer.write({ type: 'push', value: { type: 'flag', value: expr.value } }, expr.pos);
            break;

        case 'number':
            writer.write({ type: 'push', value: { type: 'number', value: expr.value } }, expr.pos);
            break;

        case 'string':
            writer.write({ type: 'push', value: { type: 'string', value: expr.value } }, expr.pos);
            break;

        case 'state':
            writer.write({ type: 'push', value: { type: 'state', value: expr.stateName } }, expr.pos);
            break;

        case 'ident':
            writer.write(
                { type: 'read', memptr: writer.getVar(expr.identifier), debugVarName: expr.identifier },
                expr.pos,
            );
            break;

        case 'call':
            for (const argExpr of expr.args) {
                compileExpression(argExpr, writer);
            }
            writer.write(
                { type: 'call', fname: expr.name, nargs: expr.args.length },
                Sourcemap.locateFunctionCall(expr),
            );
            break;

        case 'unary':
            compileExpression(expr.operand, writer);
            writer.write({ type: 'unop', operator: expr.operator }, expr.pos);
            break;

        case 'binary':
            compileExpression(expr.left, writer);
            compileExpression(expr.right, writer);
            writer.write({ type: 'binop', operator: expr.operator }, expr.pos);
            break;

        default:
            absurd(expr);
    }
}

namespace Sourcemap {
    const IF_OFFSET = 'if'.length;
    export function locateIfStmt(stmt: BsmlConditonalInstruction & { pos: CodePosition }): CodePosition {
        return { from: stmt.pos.from, to: stmt.pos.from + IF_OFFSET };
    }

    export function locateAssignStmt(stmt: BsmlAssignmentInstruction & { pos: CodePosition }): CodePosition {
        return { from: stmt.pos.from, to: stmt.pos.from + stmt.value.pos.from - 1 };
    }

    const SET_STATE_OFFSET = 'state'.length;
    export function locateSetStateStmt(stmt: BsmlSetStateInstruction & { pos: CodePosition }): CodePosition {
        return { from: stmt.pos.from, to: stmt.pos.from + SET_STATE_OFFSET };
    }

    export function locateFunctionCall(stmt: BsmlFunctionCall & { pos: CodePosition }): CodePosition {
        return { from: stmt.pos.from, to: stmt.pos.from + stmt.name.length };
    }

    const LOOP_OFFSET = 'loop'.length;
    export function locateLoopStmt(stmt: BsmlWhileLoopInstruction & { pos: CodePosition }): CodePosition {
        return { from: stmt.pos.from, to: stmt.pos.from + LOOP_OFFSET };
    }

    export function locateDeclarationEnd(
        decl: BsmlStateDeclaration | BsmlCommandDeclaration | BsmlEventListener,
    ): CodePosition {
        return { from: decl.pos.to - 1, to: decl.pos.to };
    }
}
