import { absurd } from '@/lib/errors';
import type { BsmlExpression, BsmlInstruction, BsmlProgram, CodePosition } from './program';
import type { BsmlValue } from './value';
import { getCommandStateName } from './utils';

export type CompiledInstruction =
    | { type: 'push'; value: BsmlValue }
    | { type: 'pop' }
    | { type: 'call'; fname: string; nargs: number }
    | { type: 'assign'; name: string }
    | { type: 'read'; name: string }
    // | { type: 'binop'; operator: '+' | '-' }
    | { type: 'setstate'; nargs: number }
    | { type: 'jumpz'; position: number };

export type CompiledProgram = {
    stateInstructions: Record<string, CompiledInstruction[]>;
    defaultState: string;
    sourcemap: Record<string, CodePosition[]>;
};

export function compile(program: BsmlProgram): CompiledProgram | null {
    const result: CompiledProgram = {
        stateInstructions: {
            idle: [],
            error: [],
        },
        defaultState: 'idle',
        sourcemap: {
            idle: [],
            error: [],
        },
    };

    for (const stateDecl of program.stateDeclarations) {
        if (stateDecl.isDefault) {
            result.defaultState = stateDecl.name;
        }

        result.stateInstructions[stateDecl.name] = [];
        compileCommands(stateDecl.body, result.stateInstructions[stateDecl.name]);
    }

    for (const cmdDecl of program.commandDeclarations) {
        const cmdStateName = getCommandStateName(cmdDecl.name);
        result.stateInstructions[cmdStateName] = [];
        compileCommands(cmdDecl.body, result.stateInstructions[cmdStateName]);

        // implicit return to :idle after the command has been finished
        result.stateInstructions[cmdStateName].push({ type: 'push', value: { type: 'state', value: 'idle' } });
        result.stateInstructions[cmdStateName].push({ type: 'setstate', nargs: 0 });
    }

    return result;
}

function compileCommands(cmds: BsmlInstruction[], result: CompiledInstruction[]) {
    for (const cmd of cmds) {
        switch (cmd.type) {
            case 'assign':
                compileExpression(cmd.value, result);
                result.push({ type: 'assign', name: cmd.variable });
                break;

            case 'branch': {
                compileExpression(cmd.condition, result);
                const jump = { type: 'jumpz', position: -1 } satisfies CompiledInstruction;
                result.push(jump);
                compileCommands(cmd.body, result);
                jump.position = result.length;
                break;
            }

            case 'set_state':
                compileExpression(cmd.state, result);
                for (const argExpr of cmd.args) {
                    compileExpression(argExpr, result);
                }
                result.push({ type: 'setstate', nargs: cmd.args.length });
                break;

            case 'call':
                for (const argExpr of cmd.args) {
                    compileExpression(argExpr, result);
                }
                result.push({ type: 'call', fname: cmd.name, nargs: cmd.args.length });
                result.push({ type: 'pop' }); // this call is a command, meaning its result should be ignored
                break;

            default:
                return absurd(cmd);
        }
    }
}

function compileExpression(expr: BsmlExpression, into: CompiledInstruction[]) {
    switch (expr.type) {
        case 'bool':
            into.push({ type: 'push', value: { type: 'flag', value: expr.value } });
            break;

        case 'number':
            into.push({ type: 'push', value: { type: 'number', value: expr.value } });
            break;

        case 'string':
            into.push({ type: 'push', value: { type: 'string', value: expr.value } });
            break;

        case 'state':
            into.push({ type: 'push', value: { type: 'state', value: expr.stateName } });
            break;

        case 'ident':
            switch (expr.identifier) {
                case 'random':
                case 'zero':
                    into.push({ type: 'push', value: { type: 'magic', name: expr.identifier } });
                    break;

                default:
                    into.push({ type: 'read', name: expr.identifier });
                    break;
            }

            break;

        case 'call':
            for (const argExpr of expr.args) {
                compileExpression(argExpr, into);
            }
            into.push({ type: 'call', fname: expr.name, nargs: expr.args.length });
            break;
    }
}
