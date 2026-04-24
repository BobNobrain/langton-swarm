import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum EngineConfiguration {
    Tier1Cheap = 'TIER1_CHEAP',
    Tier1Regular = 'TIER1_REG',
    Tier2 = 'TIER2',
}

type EngineCharacteristics = CommonCharacteristics & {
    power: number;
    energyConsumption: number;
};

export const ENGINE_CHARACTERISTICS: Record<EngineConfiguration, EngineCharacteristics> = {
    [EngineConfiguration.Tier1Cheap]: {
        mass: 1,
        constructionTime: 1,
        constructionCosts: { electrical: 5, structural: 5 },
        power: 1,
        energyConsumption: 5,
    },
    [EngineConfiguration.Tier1Regular]: {
        mass: 2,
        constructionTime: 1,
        constructionCosts: { electrical: 8, structural: 12 },
        power: 2,
        energyConsumption: 8,
    },
    [EngineConfiguration.Tier2]: {
        mass: 5,
        constructionTime: 20,
        constructionCosts: { electrical: 15, structural: 35, special: 3 },
        power: 3,
        energyConsumption: 11,
    },
};

export function getEnergyPerMove(config: UnitConfiguration): number {
    if (!config.engine) {
        return 0;
    }

    return ENGINE_CHARACTERISTICS[config.engine].energyConsumption;
}
