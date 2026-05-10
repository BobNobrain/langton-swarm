import type { CommonCharacteristics, ConstructionCosts, UnitConfiguration } from './types';

export enum StorageConfiguration {
    Infinite = 'INF',
    Tier1Small = 'TIER1_SMALL',
    Tier1Regular = 'TIER1_REG',
    Tier1Big = 'TIER1_BIG',
    Tier2Small = 'TIER2_SMALL',
    Tier2Regular = 'TIER2_REG',
    Tier2Big = 'TIER2_BIG',
}

type StorageCharacteristics = CommonCharacteristics & {
    capacity: number;
};

export const STORAGE_CHARACTERISTICS: Record<StorageConfiguration, StorageCharacteristics> = {
    [StorageConfiguration.Infinite]: {
        constructionCosts: {},
        constructionPoints: 0,
        mass: Infinity,
        capacity: Infinity,
    },
    [StorageConfiguration.Tier1Small]: {
        constructionCosts: { structural: 5 },
        constructionPoints: 10,
        mass: 1,
        capacity: 10,
    },
    [StorageConfiguration.Tier1Regular]: {
        constructionCosts: { structural: 8 },
        constructionPoints: 20,
        mass: 3,
        capacity: 35,
    },
    [StorageConfiguration.Tier1Big]: {
        constructionCosts: { structural: 15 },
        constructionPoints: 30,
        mass: 7,
        capacity: 70,
    },
    [StorageConfiguration.Tier2Small]: {
        constructionCosts: { structural: 50, special: 1 },
        constructionPoints: 50,
        mass: 20,
        capacity: 200,
    },
    [StorageConfiguration.Tier2Regular]: {
        constructionCosts: { structural: 150, special: 3 },
        constructionPoints: 200,
        mass: 100,
        capacity: 1000,
    },
    [StorageConfiguration.Tier2Big]: {
        constructionCosts: { structural: 500, special: 5 },
        constructionPoints: 1000,
        mass: 10_000,
        capacity: 10_000,
    },
};

export function getStorageCapacity(config: UnitConfiguration): number {
    if (!config.storage) {
        return 0;
    }

    return STORAGE_CHARACTERISTICS[config.storage].capacity;
}
