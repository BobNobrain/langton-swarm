import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum AssemblerConfiguration {
    Tier1 = 'TIER1',
    Tier2 = 'TIER2',
}

type AssemblerCharacteristics = CommonCharacteristics & {
    pointsPerTick: number;
};

export const ASSEMBLER_CHARACTERISTICS: Record<AssemblerConfiguration, AssemblerCharacteristics> = {
    [AssemblerConfiguration.Tier1]: {
        constructionCosts: { electrical: 15, structural: 20, energetical: 5 },
        constructionPoints: 100,
        mass: 10,
        pointsPerTick: 1,
    },
    [AssemblerConfiguration.Tier2]: {
        constructionCosts: { electrical: 200, structural: 100, energetical: 30 },
        constructionPoints: 1000,
        mass: 10_000,
        pointsPerTick: 10,
    },
};

export function getAssemblerSpeed(config: UnitConfiguration): number {
    if (!config.assembler) {
        return 0;
    }

    return ASSEMBLER_CHARACTERISTICS[config.assembler].pointsPerTick;
}
