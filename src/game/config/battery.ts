import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum BatteryConfiguration {
    Tier1Small = 'TIER1_SMALL',
    Tier1Regular = 'TIER1_REG',
    Tier1Big = 'TIER1_BIG',
    Tier2 = 'TIER2',
}

type BatteryCharacteristics = CommonCharacteristics & {
    capacity: number;
};

export const BATTERY_CHARACTERISTICS: Record<BatteryConfiguration, BatteryCharacteristics> = {
    [BatteryConfiguration.Tier1Small]: {
        constructionCosts: { electrical: 1, structural: 1, energetical: 5 },
        constructionTime: 1,
        mass: 2,
        capacity: 5_000,
    },
    [BatteryConfiguration.Tier1Regular]: {
        constructionCosts: { electrical: 2, structural: 1, energetical: 10 },
        constructionTime: 2,
        mass: 5,
        capacity: 10_000,
    },
    [BatteryConfiguration.Tier1Big]: {
        constructionCosts: { electrical: 4, structural: 2, energetical: 20 },
        constructionTime: 5,
        mass: 50,
        capacity: 20_000,
    },
    [BatteryConfiguration.Tier2]: {
        constructionCosts: { electrical: 20, structural: 15, energetical: 100, special: 1 },
        constructionTime: 50,
        mass: 5000,
        capacity: 100_000,
    },
};

export function getBatteryCapacity(config: UnitConfiguration): number {
    if (!config.battery) {
        return 0;
    }

    return BATTERY_CHARACTERISTICS[config.battery].capacity;
}
