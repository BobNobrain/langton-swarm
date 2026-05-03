import { getProcessorEnergyConsumption, getProcessorTickRate } from '@/game/config';
import { compile, type CompiledInstruction } from '@/game/program/compile';
import { parseProgram } from '@/game/program/parser';
import { extractCommands, getCommandStateName, isTruthy, namedArguments, renderValue } from '@/game/program/utils';
import type { BsmlValue } from '@/game/program/value';
import { absurd } from '@/lib/errors';
import { parser } from '../../program/bsml';
import type { EnergySystemController } from '../energy';
import { createUnitSystem } from '../systems';
import type { CreateUnitSystemCommonOptions, UnitSystemTickContext } from '../types';
import { fcall } from '../utils';
import { binop } from './binop';
import { CPU_FNS } from './fns';
import type { CPUData } from './types';
import { unop } from './unop';
import { popStack, setState, toErrorState } from './utils';

export function createCPUSystem(opts: CreateUnitSystemCommonOptions, battery: EnergySystemController) {
    const system = createUnitSystem<
        CPUData,
        {
            return: { value: BsmlValue | null };
        }
    >(opts, {
        name: 'cpu',

        messages: {
            return: {
                handler(payload, ctx, env) {
                    const cpu = ctx.systemData;
                    if (!cpu.waitingForReturn) {
                        return false;
                    }

                    if (payload.value && !cpu.waitingForReturn.ignoreResult) {
                        cpu.stack.push(payload.value);
                    }

                    cpu.waitingForReturn = null;

                    return true;
                },
            },
        },

        initialData({ config }) {
            const source = config.cpu;
            if (typeof source !== 'string') {
                return null;
            }

            // TODO: compilation cache
            const parsed = parseProgram(source, parser.parse(source));
            const compiled = compile(parsed.program);
            if (!compiled) {
                throw new Error('TODO');
            }

            return {
                program: compiled,
                commands: extractCommands(parsed.program),
                energyConsumption: getProcessorEnergyConsumption(config),
                tickRate: getProcessorTickRate(config),

                state: compiled.defaultState,
                ptr: 0,
                stack: [],
                variables: {},
                waitingForReturn: null,

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
            if (!battery.withdraw(ctx.unitId, 1)) {
                ctx.sleep();
                setState(cpu, cpu.program.defaultState);
                return;
            }

            const instruction = instructions[cpu.ptr];
            ++cpu.ptr;
            cpu.lastUpdated = env.currentTick;

            runInstruction(ctx, cpu, instruction);
        },

        queryCommands(ctx) {
            const cpu = ctx.systemData;
            return cpu.commands;
        },
        executeCommand(call, ctx) {
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

    battery.recharged.subToAll(({ unitId }) => {
        const cpu = system.getData(unitId);
        if (!cpu) {
            return;
        }

        system.activate(unitId);
    });

    return system;
}

function runInstruction(ctx: UnitSystemTickContext<CPUData>, cpu: CPUData, instruction: CompiledInstruction) {
    switch (instruction.type) {
        case 'assign': {
            const [value] = popStack(cpu, 1);
            if (!value) {
                break;
            }

            cpu.variables[instruction.name] = value;
            break;
        }

        case 'call': {
            const argv = popStack(cpu, instruction.nargs);
            if (argv.length !== instruction.nargs) {
                break;
            }

            if (CPU_FNS[instruction.fname]) {
                cpu.stack.push(CPU_FNS[instruction.fname].call(...argv));
                break;
            }

            const [system, fn] = instruction.fname.split('.');
            cpu.waitingForReturn = { system, ignoreResult: false };
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

        case 'jump':
            cpu.ptr = instruction.position;
            break;

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

            if (argv.length) {
                const argNames = cpu.program.stateArgNames[targetState.value];
                if (argNames) {
                    Object.assign(cpu.variables, namedArguments(argNames, argv));
                }
            }
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
}
