import { getProcessorEnergyConsumption, getProcessorTickRate } from '@/game/config';
import type { GameNots } from '@/game/nots';
import {
    type BsmlValue,
    type CompiledInstruction,
    extractCommands,
    isTruthy,
    namedArguments,
    renderValue,
    getCommandStateName,
} from '@/game/program';
import { absurd } from '@/lib/errors';
import type { EnergySystemController } from '../energy';
import { createUnitEvent } from '../events';
import { fcall } from '../func';
import { createUnitSystem } from '../systems';
import type { CreateUnitSystemCommonOptions, UnitSystemTickContext } from '../types';
import { binop } from './binop';
import { CPU_FNS } from './fns';
import type { CPUData, CPUFunctionsDeps, CPUSystemController } from './types';
import { unop } from './unop';
import { popStack, pushToStack, setState, toErrorState } from './utils';

const CPU_SYSTEM_NAME = 'cpu';
const UPGRADE_DELAY_TICKS = 50;

export function createCPUSystem(opts: CreateUnitSystemCommonOptions, battery: EnergySystemController, nots: GameNots) {
    const updated = createUnitEvent<CPUData>();
    opts.events.push(updated);

    const deps: CPUFunctionsDeps = {
        nots,
    };

    const controller: CPUSystemController = {
        updated,
        getData: null as never, // to be assigned later
        upgrade(unitIds, { program }) {
            const commands = extractCommands(program.parsed);
            const defaultState = program.compiled.defaultState;

            for (const unitId of unitIds) {
                const cpu = system.getData(unitId);
                if (!cpu) {
                    continue;
                }

                system.activate(unitId, UPGRADE_DELAY_TICKS);
                cpu.isUpgrading = true;
                cpu.program = program.compiled;
                cpu.commands = commands;
                setState(cpu, defaultState);
            }
        },
        triggerEvent(unitId, event) {
            opts.sendMessage(CPU_SYSTEM_NAME, { event: 'event', payload: { name: event }, unitId });
        },
    };

    const system = createUnitSystem<
        CPUData,
        {
            return: { value: BsmlValue | null };
            event: { name: string };
        }
    >(opts, {
        name: CPU_SYSTEM_NAME,

        messages: {
            return: {
                handler(payload, ctx) {
                    const cpu = ctx.systemData;
                    if (!cpu.waitingForReturn) {
                        return false;
                    }

                    updated.pub({ unitId: ctx.unitId, payload: cpu });

                    if (payload.value && !cpu.waitingForReturn.ignoreResult) {
                        pushToStack(cpu, payload.value, cpu.waitingForReturn.fname);
                    }

                    cpu.waitingForReturn = null;

                    return true;
                },
            },
            event: {
                handler(payload, ctx) {
                    // const cpu = ctx.systemData;
                    // TODO
                    // return true

                    return false;
                },
            },
        },

        initialData({ config }, unitId) {
            const program = config.program;
            if (!program) {
                return null;
            }

            controller.triggerEvent(unitId, 'spawned');

            return {
                program: program.compiled,
                commands: extractCommands(program.parsed),
                energyConsumption: getProcessorEnergyConsumption(config),
                tickRate: getProcessorTickRate(config),

                state: program.compiled.defaultState,
                ptr: 0,
                stack: [],
                stackSources: [],
                variables: {},
                waitingForReturn: null,
                isUpgrading: false,
            };
        },

        tick(ctx) {
            const cpu = ctx.systemData;
            const instructions = cpu.program.stateInstructions[cpu.state];

            if (cpu.isUpgrading) {
                controller.triggerEvent(ctx.unitId, 'upgraded');
                cpu.isUpgrading = false;
                return;
            }

            if (!instructions || !instructions.length) {
                ctx.sleep();
                return;
            }

            updated.pub({ unitId: ctx.unitId, payload: cpu });

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
            runInstruction(ctx, cpu, instruction, deps);
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

            updated.pub({ unitId: ctx.unitId, payload: ctx.systemData });
            return true;
        },
    });

    controller.getData = system.getData;

    battery.recharged.subToAll(({ unitId }) => {
        const cpu = system.getData(unitId);
        if (!cpu) {
            return;
        }

        system.activate(unitId);
    });

    return { system, controller };
}

function runInstruction(
    ctx: UnitSystemTickContext<CPUData>,
    cpu: CPUData,
    instruction: CompiledInstruction,
    deps: CPUFunctionsDeps,
) {
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
                pushToStack(cpu, CPU_FNS[instruction.fname].call(argv, ctx, deps), instruction.fname);
                break;
            }

            const [system, fn] = instruction.fname.split('.');
            cpu.waitingForReturn = { system, fname: instruction.fname, ignoreResult: false };
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
            pushToStack(cpu, instruction.value, '(constant)');
            break;

        case 'pop':
            popStack(cpu, 1);
            break;

        case 'read': {
            const value = cpu.variables[instruction.name];
            if (value) {
                pushToStack(cpu, value, instruction.name);
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

            pushToStack(cpu, result, `(calculation result`);
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

            pushToStack(cpu, result, `(calculation result)`);
            break;

        default:
            return absurd(instruction);
    }
}
