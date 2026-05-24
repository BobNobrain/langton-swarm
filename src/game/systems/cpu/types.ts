import type { UnitCommand, UnitConfiguration, UnitId } from '@/game';
import type { CompiledProgram, BsmlValue, CompiledInstruction } from '@/game/program';
import type { UnitEvent } from '../events';
import type { GameNots } from '@/game/nots';

export type CPUFrameData = {
    readonly code: readonly CompiledInstruction[];
    ptr: number;
    stack: BsmlValue[];
    stackSources: string[];
    locals: Record<string, BsmlValue>;
};

export type CPUData = {
    program: CompiledProgram;
    commands: UnitCommand[];
    energyConsumption: number;
    tickRate: number;

    state: string;
    ptr: number;
    stack: BsmlValue[];
    /** For unit debugging – a human-readable explanation of what have spawned a particular stack value */
    stackSources: string[];
    variables: Record<string, BsmlValue>;
    waitingForReturn: null | {
        system: string;
        fname: string;
        ignoreResult: boolean;
    };
    isUpgrading: boolean;
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
