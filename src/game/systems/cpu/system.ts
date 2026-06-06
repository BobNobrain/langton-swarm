import { getProcessorEnergyConsumption, getProcessorTickRate, type UnitConfiguration } from '@/game/config';
import type { GameNots } from '@/game/nots';
import {
    type BsmlValue,
    type CompiledInstruction,
    isTruthy,
    namedArguments,
    renderValue,
    getCommandStateName,
} from '@/game/program';
import type { UnitCommand, UnitCommandCall, UnitId } from '@/game/types';
import { absurd } from '@/lib/errors';
import type { EnergySystemController } from '../energy';
import { createUnitEvent, type UnitEvent } from '../events';
import { UnitSystem, type UnitSystemTickContext } from '../UnitSystem';
import type { UnitSystemOrchestrator, SpawnOptions } from '../types';
import { binop } from './binop';
import { CPU_FNS } from './fns';
import type { CPUData, CPUFunctionsDeps, CPUSystemController } from './types';
import { unop } from './unop';
import { popStack, pushToStack, setState, toErrorState } from './utils';

const CPU_SYSTEM_NAME = 'cpu';
const UPGRADE_DELAY_TICKS = 50;

export class CPUSystem extends UnitSystem<CPUData> implements CPUSystemController {
    readonly updated: UnitEvent<CPUData>;
    private deps: CPUFunctionsDeps;

    constructor(
        opts: UnitSystemOrchestrator,
        private battery: EnergySystemController,
        nots: GameNots,
    ) {
        super(CPU_SYSTEM_NAME, opts);

        this.registerEvent((this.updated = createUnitEvent()));
        this.deps = { nots };

        this.registerMessageHandler<{ value: BsmlValue | null }>('return', (payload, ctx) => {
            const cpu = ctx.systemData;
            if (!cpu.waitingForReturn) {
                return;
            }

            this.updated.pub({ unitId: ctx.unitId, payload: cpu });

            if (payload.value && !cpu.waitingForReturn.ignoreResult) {
                pushToStack(cpu, payload.value, cpu.waitingForReturn.fname);
            }

            cpu.waitingForReturn = null;
            this.activate(ctx.unitId);

            return;
        });

        this.registerMessageHandler<{ name: string }>('event', (payload, ctx) => {
            // const cpu = ctx.systemData;
            // TODO
            // this.activate(ctx.unitId)

            return;
        });

        battery.recharged.subToAll(({ unitId }) => {
            const cpu = this.getData(unitId);
            if (!cpu) {
                return;
            }

            this.activate(unitId);
        });
    }

    upgrade(unitIds: UnitId[], { program }: Required<Pick<UnitConfiguration, 'program'>>): void {
        const { commands, defaultState } = program.compiled;

        for (const unitId of unitIds) {
            const cpu = this.getData(unitId);
            if (!cpu) {
                continue;
            }

            this.activate(unitId, UPGRADE_DELAY_TICKS);
            cpu.isUpgrading = true;
            cpu.program = program.compiled;
            cpu.commands = commands;
            setState(cpu, defaultState);
        }
    }
    triggerEvent(unitId: UnitId, event: string): void {
        this.sendMessage(CPU_SYSTEM_NAME, { event: 'event', payload: { name: event }, unitId });
    }
    queryCommands(unitId: UnitId): UnitCommand[] {
        const cpu = this.getData(unitId);
        return cpu?.commands ?? [];
    }
    executeCommand(unitId: UnitId, call: UnitCommandCall): void {
        const cpu = this.getData(unitId);
        if (!cpu) {
            return;
        }

        const cmd = cpu.commands.find((cmd) => cmd.name === call.name);
        if (!cmd) {
            return;
        }

        setState(cpu, getCommandStateName(call.name));
        Object.assign(
            cpu.variables,
            namedArguments(
                cmd.args.map((arg) => arg.name),
                call.args,
            ),
        );

        this.activate(unitId);

        this.updated.pub({ unitId, payload: cpu });
    }

    protected initialData({ config }: SpawnOptions, unitId: UnitId): CPUData | null {
        const program = config.program;
        if (!program) {
            return null;
        }

        this.triggerEvent(unitId, 'spawned');

        return {
            program: program.compiled,
            commands: program.compiled.commands,
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
    }

    protected onTick(ctx: UnitSystemTickContext<CPUData>): void {
        const cpu = ctx.systemData;
        const instructions = cpu.program.stateInstructions[cpu.state];

        if (cpu.isUpgrading) {
            this.triggerEvent(ctx.unitId, 'upgraded');
            cpu.isUpgrading = false;
            return;
        }

        if (!instructions || !instructions.length) {
            this.sleep(ctx.unitId);
            return;
        }

        this.updated.pub({ unitId: ctx.unitId, payload: cpu });

        if (cpu.ptr >= instructions.length || cpu.ptr < 0) {
            cpu.ptr = 0;
        }

        this.sleep(ctx.unitId, cpu.tickRate);
        if (!this.battery.withdraw(ctx.unitId, 1)) {
            this.sleep(ctx.unitId);
            setState(cpu, cpu.program.defaultState);
            return;
        }

        const instruction = instructions[cpu.ptr];
        ++cpu.ptr;
        this.runInstruction(ctx, instruction);
    }

    private runInstruction(ctx: UnitSystemTickContext<CPUData>, instruction: CompiledInstruction) {
        const cpu = ctx.systemData;

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
                    pushToStack(cpu, CPU_FNS[instruction.fname].call(argv, ctx, this.deps), instruction.fname);
                    break;
                }

                const [system, fn] = instruction.fname.split('.');
                cpu.waitingForReturn = { system, fname: instruction.fname, ignoreResult: false };
                this.sleep(ctx.unitId);
                this.fcall(ctx.unitId, system, fn, argv);
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
}
