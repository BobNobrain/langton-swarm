import { absurd } from '@/lib/errors';
import { getProcessorTickRate } from '../config';
import { parser } from '../program/bsml';
import { compile, type CompiledProgram } from '../program/compile';
import { parseProgram } from '../program/parser';
import { extractCommands, getCommandStateName, isTruthy, namedArguments, renderValue } from '../program/utils';
import type { BsmlValue, BsmlValueType } from '../program/value';
import type { UnitCommand } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
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
                    const argv: BsmlValue[] = cpu.stack.slice(-instruction.nargs);
                    if (argv.length !== instruction.nargs) {
                        toErrorState(cpu, `need at least ${instruction.nargs} elements in stack`);
                        break;
                    }

                    cpu.stack.length -= instruction.nargs;
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
    {
        argTypes: BsmlValueType[];
        returnType: BsmlValueType;
        call: (...args: BsmlValue[]) => BsmlValue;
    }
> = {};

function toErrorState(cpu: CPUData, msg: string) {
    setState(cpu, 'error');
    cpu.variables.message = { type: 'string', value: msg };
    cpu.variables.prev = { type: 'state', value: cpu.state };
    cpu.variables.ptr = { type: 'number', value: cpu.ptr };
    cpu.variables.stack = { type: 'string', value: cpu.stack.map(renderValue).join(', ') };
}

function setState(cpu: CPUData, state: string) {
    cpu.state = state;
    cpu.variables = {};
    cpu.stack = [];
    cpu.ptr = 0;
    cpu.isWaitingForReturn = false;
}

function popStack(cpu: CPUData, n = 1): BsmlValue[] {
    if (cpu.stack.length < n) {
        toErrorState(cpu, `not enough items in stack: expected ${n}, got ${cpu.stack.length}`);
        return [];
    }

    const result = cpu.stack.slice(-n);
    cpu.stack.length -= n;
    return result;
}
