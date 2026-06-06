import { absurd } from '@/lib/errors';
import type { UnitCommand } from '../types';
import type {
    BsmlAssignmentInstruction,
    BsmlConditonalInstruction,
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
    | { type: 'assign'; name: string }
    | { type: 'read'; name: string }
    | { type: 'binop'; operator: string }
    | { type: 'unop'; operator: string }
    | { type: 'setstate'; nargs: number }
    | { type: 'jump'; position: number }
    | { type: 'jumpz'; position: number };

export type CompiledProgram = {
    instructions: CompiledInstruction[];
    stateStarts: Record<string, number>;
    defaultState: string;
    stateArgNames: Record<string, string[]>;
    sourcemap: CodePosition[];
    commands: UnitCommand[];
};

class InstructionWriter {
    readonly start: number;
    private instructions: CompiledInstruction[];
    private sourcemap: CodePosition[];

    constructor(result: CompiledProgram) {
        this.instructions = result.instructions;
        this.sourcemap = result.sourcemap;
        this.start = result.instructions.length;
    }

    write(instruction: CompiledInstruction, codePos: CodePosition) {
        this.instructions.push(instruction);
        this.sourcemap.push(codePos);
    }
    length() {
        return this.instructions.length;
    }
}

export function compile(program: BsmlProgram): CompiledProgram {
    const result: CompiledProgram = {
        instructions: [],
        stateStarts: {
            idle: -1,
            error: -1,
        },
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
        compileCommands(stateDecl.body, w);
        w.write({ type: 'jump', position: w.start }, Sourcemap.locateStateDeclarationEnd(stateDecl));

        result.stateStarts[stateDecl.name] = w.start;
    }

    for (const cmdDecl of program.commandDeclarations) {
        const cmdStateName = getCommandStateName(cmdDecl.name);
        const w = new InstructionWriter(result);

        compileCommands(cmdDecl.body, w);

        // implicit return to :idle after the command has been finished
        result.instructions.push({ type: 'push', value: { type: 'state', value: 'idle' } });
        result.instructions.push({ type: 'setstate', nargs: 0 });

        result.stateStarts[cmdStateName] = w.start;
    }

    return result;
}

function compileCommands(cmds: BsmlInstruction[], writer: InstructionWriter) {
    for (const cmd of cmds) {
        switch (cmd.type) {
            case 'assign':
                compileExpression(cmd.value, writer);
                writer.write({ type: 'assign', name: cmd.variable }, Sourcemap.locateAssignStmt(cmd));
                break;

            case 'branch': {
                compileExpression(cmd.condition, writer);
                const jump = { type: 'jumpz', position: -1 } satisfies CompiledInstruction;
                writer.write(jump, Sourcemap.locateIfStmt(cmd));
                compileCommands(cmd.body, writer);
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

                    compileCommands(cmd.body, writer);

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

                    compileCommands(cmd.body, writer);
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
            writer.write({ type: 'read', name: expr.identifier }, expr.pos);
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

    export function locateStateDeclarationEnd(decl: BsmlStateDeclaration): CodePosition {
        return { from: decl.pos.to - 1, to: decl.pos.to };
    }
}
