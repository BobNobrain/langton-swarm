import type { UnitCommand, UnitConfiguration, UnitId } from '@/game';
import type { CompiledProgram, BsmlValue, CompiledInstruction } from '@/game/program';
import type { UnitEvent } from '../events';
import type { GameNots } from '@/game/nots';

export type CPUFrameData = {
    ptr: number;
    stack: BsmlValue[];
    stackSources: string[];
};

export type CPUData = {
    program: CompiledProgram;
    energyConsumption: number;
    tickRate: number;

    state: string;
    ptr: number;
    waitingForReturn: null | {
        system: string;
        fname: string;
        ignoreResult: boolean;
    };
    upgradeEnds: number;

    stack: BsmlValue[];
    /** For unit debugging – a human-readable explanation of what have spawned a particular stack value */
    stackSources: string[];

    memory: BsmlValue[];
    /** For unit debugging – a map of memory cells to the variable name it represents */
    memoryVarnames: string[];

    eventQueue: { name: string }[]; // queue all events and run them one after another (but an event interrupts the main code)
    /** Main program state to restore when event handlers are done */
    programSavedState: {
        memory: BsmlValue[];
        memoryVarnames: string[];
        ptr: number;
    } | null;
};

export type CPUSystemController = {
    updated: UnitEvent<CPUData>;
    getData: (unitId: UnitId) => CPUData | null;
    upgrade(unitIds: UnitId[], upgrade: Required<Pick<UnitConfiguration, 'program'>>): void;
    triggerEvent(unitId: UnitId, event: string): void;
};

export type CPUFunctionsDeps = {
    nots: Pick<GameNots, 'post'>;
};
