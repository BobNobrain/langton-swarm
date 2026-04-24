import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum AssemblerConfiguration {
    Tier1 = 'TIER1',
    Tier2 = 'TIER2',
}

type AssemblerCharacteristics = CommonCharacteristics & {
    speed: number;
};

export const ASSEMBLER_CHARACTERISTICS: Record<AssemblerConfiguration, AssemblerCharacteristics> = {
    [AssemblerConfiguration.Tier1]: {
        constructionCosts: { electrical: 15, structural: 20, energetical: 5 },
        constructionTime: 10,
        mass: 10,
        speed: 0.1,
    },
    [AssemblerConfiguration.Tier2]: {
        constructionCosts: { electrical: 200, structural: 100, energetical: 30 },
        constructionTime: 100,
        mass: 10_000,
        speed: 1,
    },
};

export function getAssemblerSpeed(config: UnitConfiguration): number {
    if (!config.assembler) {
        return 0;
    }

    return ASSEMBLER_CHARACTERISTICS[config.assembler].speed;
}
