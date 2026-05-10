import type { CompiledProgram } from '@/game/program/compile';
import type { BsmlValue } from '@/game/program/value';
import type { UnitCommand } from '@/game/types';

export type CPUData = {
    program: CompiledProgram;
    commands: UnitCommand[];
    energyConsumption: number;
    tickRate: number;

    state: string;
    ptr: number;
    stack: BsmlValue[];
    variables: Record<string, BsmlValue>;
    waitingForReturn: null | {
        system: string;
        ignoreResult: boolean;
    };
};
