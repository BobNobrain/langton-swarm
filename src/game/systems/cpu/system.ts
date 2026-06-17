import { getProcessorEnergyConsumption, getProcessorTickRate, type UnitConfiguration } from '@/game/config';
import type { GameNots } from '@/game/nots';
import type { BsmlValue, CompiledInstruction } from '@/game/program';
import { isTruthy, renderValue, getCommandStateName } from '@/game/program/utils';
import type { UnitCommand, UnitCommandCall, UnitId } from '@/game/types';
import { absurd } from '@/lib/errors';
import type { AssemblerSystemController } from '../assembler';
import type { EnergySystemController } from '../energy';
import { createUnitEvent, type UnitEvent } from '../events';
import { UnitSystem, type UnitSystemTickContext } from '../UnitSystem';
import type { UnitSystemOrchestrator, SpawnOptions } from '../types';
import { binop } from './binop';
import { CPU_EVENT_MESSAGE_NAME, CPU_RETURN_MESSAGE_NAME, CpuEvent, UPGRADE_DELAY_TICKS } from './constants';
import { CPU_FNS } from './fns';
import type { CPUData, CPUFunctionsDeps, CPUSystemController } from './types';
import { unop } from './unop';
import { invokeEventHandler, popStack, pushToStack, restoreAfterEvent, setState, toErrorState } from './utils';

const CPU_SYSTEM_NAME = 'cpu';

export class CPUSystem extends UnitSystem<CPUData> implements CPUSystemController {
    readonly updated: UnitEvent<CPUData>;
    private deps: CPUFunctionsDeps;

    constructor(
        opts: UnitSystemOrchestrator,
        private battery: EnergySystemController,
        nots: GameNots,
        {
            assembler,
        }: {
            assembler: AssemblerSystemController;
        },
    ) {
        super(CPU_SYSTEM_NAME, opts);

        this.registerEvent((this.updated = createUnitEvent()));
        this.deps = { nots };

        this.registerMessageHandler<{ value: BsmlValue | null }>(CPU_RETURN_MESSAGE_NAME, (payload, ctx) => {
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

        this.registerMessageHandler<{ name: string }>(CPU_EVENT_MESSAGE_NAME, (payload, ctx) => {
            const cpu = ctx.systemData;
            cpu.eventQueue.push({ name: payload.name });
            this.activate(ctx.unitId);

            return;
        });

        battery.recharged.subToAll(({ unitId }) => {
            const cpu = this.getData(unitId);
            if (!cpu) {
                return;
            }

            this.activate(unitId);
        });

        // events that can potentially be catched in a program
        battery.drained.subToAll(({ unitId }) => {
            this.triggerEvent(unitId, CpuEvent.BatteryLow);
        });

        assembler.queueUpdated.subToAll(({ unitId }) => {
            this.triggerEvent(unitId, CpuEvent.AssemblerQueueUpdated);
        });
    }

    upgrade(unitIds: UnitId[], { program }: Required<Pick<UnitConfiguration, 'program'>>): void {
        const { defaultState } = program.compiled;

        for (const unitId of unitIds) {
            const cpu = this.getData(unitId);
            if (!cpu) {
                continue;
            }

            this.activate(unitId, UPGRADE_DELAY_TICKS);
            cpu.upgradeEnds = this.currentTick() + UPGRADE_DELAY_TICKS;
            cpu.program = program.compiled;
            setState(cpu, defaultState, [], []);
            cpu.eventQueue.push({ name: CpuEvent.Upgraded });
        }
    }
    triggerEvent(unitId: UnitId, event: string): void {
        this.sendMessage(CPU_SYSTEM_NAME, { event: CPU_EVENT_MESSAGE_NAME, payload: { name: event }, unitId });
    }
    queryCommands(unitId: UnitId): UnitCommand[] {
        const cpu = this.getData(unitId);
        return cpu?.program.commands ?? [];
    }
    executeCommand(unitId: UnitId, call: UnitCommandCall): void {
        const cpu = this.getData(unitId);
        if (!cpu) {
            return;
        }

        const cmd = cpu.program.commands.find((cmd) => cmd.name === call.name);
        if (!cmd) {
            return;
        }

        setState(
            cpu,
            getCommandStateName(call.name),
            call.args,
            cmd.args.map((arg) => arg.name),
        );

        this.activate(unitId);

        this.updated.pub({ unitId, payload: cpu });
    }

    protected initialData({ config }: SpawnOptions, unitId: UnitId): CPUData | null {
        const program = config.program;
        if (!program) {
            return null;
        }

        return {
            program: program.compiled,
            energyConsumption: getProcessorEnergyConsumption(config),
            tickRate: getProcessorTickRate(config),

            state: program.compiled.defaultState,
            ptr: program.compiled.stateStarts[program.compiled.defaultState] ?? -1,
            waitingForReturn: null,
            upgradeEnds: -1,

            stack: [],
            stackSources: [],
            memory: [],
            memoryVarnames: [],

            eventQueue: [{ name: CpuEvent.Spawned }],
            programSavedState: null,
        };
    }

    protected onTick(ctx: UnitSystemTickContext<CPUData>): void {
        const cpu = ctx.systemData;
        const instructions = cpu.program.instructions;
        const tick = this.currentTick();

        if (cpu.upgradeEnds > tick) {
            this.sleep(ctx.unitId, cpu.upgradeEnds - tick);
            return;
        }

        if (cpu.waitingForReturn) {
            this.sleep(ctx.unitId);
            return;
        }

        if (!cpu.programSavedState && cpu.eventQueue.length) {
            while (cpu.eventQueue.length) {
                const nextEvent = cpu.eventQueue.shift()!;
                const handlerStart = cpu.program.eventStarts[nextEvent.name];
                if (handlerStart !== undefined) {
                    invokeEventHandler(cpu, handlerStart);
                    break;
                }
            }
        }

        if (cpu.ptr < 0) {
            // idle state
            this.sleep(ctx.unitId);
            return;
        }

        this.updated.pub({ unitId: ctx.unitId, payload: cpu });

        if (cpu.ptr >= instructions.length) {
            toErrorState(cpu, 'Instruction pointer went out of bounds');
            return;
        }

        this.sleep(ctx.unitId, cpu.tickRate);
        if (!this.battery.withdraw(ctx.unitId, 1)) {
            this.sleep(ctx.unitId);
            setState(cpu, cpu.program.defaultState, [], []);
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

                cpu.memory[instruction.memptr] = value;
                cpu.memoryVarnames[instruction.memptr] = instruction.debugVarName;
                break;
            }

            case 'call': {
                const argv = popStack(cpu, instruction.nargs);
                if (argv.length !== instruction.nargs) {
                    toErrorState(cpu, 'Not enough values in stack for function call');
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
                const value = cpu.memory[instruction.memptr];
                if (!value) {
                    toErrorState(cpu, 'Invalid memory access');
                    break;
                }

                pushToStack(cpu, value, instruction.debugVarName);
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

                setState(cpu, targetState.value, argv, cpu.program.stateArgNames[targetState.value] ?? []);
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

            case 'ret':
                restoreAfterEvent(cpu);
                break;

            default:
                return absurd(instruction);
        }
    }
}
