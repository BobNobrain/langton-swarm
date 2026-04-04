import { absurd } from '@/lib/errors';
import { getProcessorTickRate } from '../config';
import { parser } from '../program/bsml';
import { compile, type CompiledProgram } from '../program/compile';
import { parseProgram } from '../program/parser';
import { extractCommands, getCommandStateName, isTruthy, namedArguments, renderValue } from '../program/utils';
import type { BsmlValue, BsmlValueType } from '../program/value';
import type { UnitCommand } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions, UnitSystemFunction } from './types';
import { fcall } from './utils';

export type CPUData = {
    program: CompiledProgram;
    commands: UnitCommand[];
    state: string;
    ptr: number;
    stack: BsmlValue[];
    variables: Record<string, BsmlValue>;
    isWaitingForReturn: boolean;
    tickRate: number;

    lastUpdated: number;
};

export function createCPUSystem(opts: CreateUnitSystemCommonOptions) {
    return createUnitSystem<
        CPUData,
        {
            return: { value: BsmlValue | null };
        }
    >(opts, {
        name: 'cpu',

        messages: {
            return: {
                handler(payload, ctx, env) {
                    if (!ctx.systemData.isWaitingForReturn) {
                        return false;
                    }

                    if (payload.value) {
                        ctx.systemData.stack.push(payload.value);
                    }

                    ctx.systemData.isWaitingForReturn = false;

                    return true;
                },
            },
        },

        initialData(config, state) {
            const source = config.cpu;
            if (typeof source !== 'string') {
                return null;
            }

            const parsed = parseProgram(source, parser.parse(source));
            const compiled = compile(parsed.program);
            if (!compiled) {
                throw new Error('TODO');
            }

            console.log(compiled);

            return {
                program: compiled,
                commands: extractCommands(parsed.program),
                state: compiled.defaultState,
                ptr: 0,
                stack: [],
                variables: {},
                isWaitingForReturn: false,
                tickRate: getProcessorTickRate(config),
                lastUpdated: 0,
            };
        },

        tick(ctx, env) {
            const cpu = ctx.systemData;
            const instructions = cpu.program.stateInstructions[cpu.state];

            if (cpu.state === 'error') {
                console.error(ctx.unitId, cpu.variables);
            }

            if (!instructions || !instructions.length) {
                ctx.sleep();
                return;
            }

            if (cpu.ptr >= instructions.length || cpu.ptr < 0) {
                cpu.ptr = 0;
            }

            ctx.sleep(cpu.tickRate);

            const instruction = instructions[cpu.ptr];
            ++cpu.ptr;
            cpu.lastUpdated = env.currentTick;

            switch (instruction.type) {
                case 'assign': {
                    const value = cpu.stack.pop();
                    if (!value) {
                        toErrorState(cpu, 'stack is empty');
                        break;
                    }

                    cpu.variables[instruction.name] = value;
                    break;
                }

                case 'call': {
                    const argv = popStack(cpu, instruction.nargs);
                    if (argv.length !== instruction.nargs) {
                        toErrorState(cpu, `need at least ${instruction.nargs} elements in stack`);
                        break;
                    }

                    if (CPU_FNS[instruction.fname]) {
                        cpu.stack.push(CPU_FNS[instruction.fname].call(...argv));
                        break;
                    }

                    const [system, fn] = instruction.fname.split('.');
                    cpu.isWaitingForReturn = true;
                    ctx.sleep();
                    fcall(ctx, system, { fname: fn, argv });
                    break;
                }

                case 'jumpz': {
                    const [condition] = popStack(cpu, 1);
                    if (!isTruthy(condition)) {
                        cpu.ptr = instruction.position;
                    }
                    break;
                }

                case 'push':
                    cpu.stack.push(instruction.value);
                    break;

                case 'pop':
                    cpu.stack.pop();
                    break;

                case 'read': {
                    const value = cpu.variables[instruction.name];
                    if (value) {
                        cpu.stack.push(value);
                    }
                    break;
                }

                case 'setstate': {
                    const [targetState, ...argv] = popStack(cpu, instruction.nargs + 1);
                    if (!targetState) {
                        break;
                    }

                    if (targetState.type !== 'state') {
                        toErrorState(cpu, `cannot setstate to ${renderValue(targetState)}`);
                        break;
                    }

                    setState(cpu, targetState.value);
                    break;
                }

                case 'binop': {
                    const result = binop(cpu, instruction.operator);
                    if (!result) {
                        if (cpu.state !== 'error') {
                            toErrorState(cpu, `cound not run a binary operation: ${instruction.operator}`);
                        }
                        break;
                    }

                    cpu.stack.push(result);
                    break;
                }

                case 'unop':
                    const result = unop(cpu, instruction.operator);
                    if (!result) {
                        if (cpu.state !== 'error') {
                            toErrorState(cpu, `cound not run an unary operation: ${instruction.operator}`);
                        }
                        break;
                    }

                    cpu.stack.push(result);
                    break;

                default:
                    return absurd(instruction);
            }
        },

        queryCommands(ctx, env) {
            const cpu = ctx.systemData;
            return cpu.commands;
        },
        executeCommand(call, ctx, env) {
            const cmd = ctx.systemData.commands.find((cmd) => cmd.name === call.name);
            if (!cmd) {
                return false;
            }

            setState(ctx.systemData, getCommandStateName(call.name));
            Object.assign(
                ctx.systemData.variables,
                namedArguments(
                    cmd.args.map((arg) => arg.name),
                    call.args,
                ),
            );

            return true;
        },
    });
}

export const CPU_FNS: Record<
    string,
    UnitSystemFunction & {
        call: (...args: BsmlValue[]) => BsmlValue;
    }
> = {};

function toErrorState(cpu: CPUData, msg: string) {
    const prev = { ...cpu };
    setState(cpu, 'error');
    cpu.variables.message = { type: 'string', value: msg };
    cpu.variables.prev = { type: 'state', value: prev.state };
    cpu.variables.ptr = { type: 'number', value: prev.ptr };
    cpu.variables.stack = { type: 'string', value: prev.stack.map(renderValue).join(', ') };
}

function setState(cpu: CPUData, state: string) {
    cpu.state = state;
    cpu.variables = {};
    cpu.stack = [];
    cpu.ptr = 0;
    cpu.isWaitingForReturn = false;
}

function popStack(cpu: CPUData, n = 1): BsmlValue[] {
    if (n === 0) {
        return [];
    }

    if (cpu.stack.length < n) {
        toErrorState(cpu, `not enough items in stack: expected ${n}, got ${cpu.stack.length}`);
        return [];
    }

    const result = cpu.stack.slice(-n);
    cpu.stack.length -= n;
    return result;
}

function binop(cpu: CPUData, op: string): BsmlValue | null {
    const [left, right] = popStack(cpu, 2);
    if (!right) {
        return null;
    }

    switch (op) {
        case '==':
            if (left.type !== right.type) {
                return { type: 'flag', value: false };
            }
            if (left.type === 'null') {
                return { type: 'flag', value: true };
            }
            if (left.type === 'magic') {
                return { type: 'flag', value: false };
            }
            return { type: 'flag', value: left.value === (right as typeof left).value };

        case '/=':
            if (left.type !== right.type) {
                return { type: 'flag', value: true };
            }
            if (left.type === 'null') {
                return { type: 'flag', value: false };
            }
            if (left.type === 'magic') {
                return { type: 'flag', value: true };
            }
            return { type: 'flag', value: left.value !== (right as typeof left).value };

        case '>':
            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value > right.value,
            };
        case '>=':
            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value >= right.value,
            };
        case '<':
            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value < right.value,
            };
        case '<=':
            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value <= right.value,
            };

        case '*':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value * right.value }
                : null;
        case '/':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value / right.value }
                : null;
        case '%':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value % right.value }
                : null;
        case '+':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value + right.value }
                : null;
        case '-':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value - right.value }
                : null;

        case 'and':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value && right.value }
                : null;
        case 'or':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value || right.value }
                : null;
        case 'xor':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value !== right.value }
                : null;

        default:
            return null;
    }
}

function unop(cpu: CPUData, op: string): BsmlValue | null {
    const [operand] = popStack(cpu);
    if (!operand) {
        return null;
    }

    switch (op) {
        case '-':
            return operand.type === 'number' ? { type: 'number', value: -operand.value } : null;
        case '+':
            return operand.type === 'number' ? { type: 'number', value: -operand.value } : null;

        case 'not':
            return { type: 'flag', value: !isTruthy(operand) };

        default:
            return null;
    }
}
