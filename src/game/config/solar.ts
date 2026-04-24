import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum SolarConfiguration {
    Tier1Cheap = 'TIER1_CHEAP',
    Tier1Regular = 'TIER1_REG',
    Tier2Mobile = 'TIER2_MOBILE',
    Tier2Static = 'TIER2_STATIC',
}

export type SolarCharacteristics = CommonCharacteristics & {
    maxPower: number;
};

export const SOLAR_CHARACTERISTICS: Record<SolarConfiguration, SolarCharacteristics> = {
    [SolarConfiguration.Tier1Cheap]: {
        constructionCosts: { electrical: 5, structural: 1, energetical: 5 },
        constructionTime: 1,
        mass: 2,
        maxPower: 1,
    },
    [SolarConfiguration.Tier1Regular]: {
        constructionCosts: { electrical: 15, structural: 3, energetical: 12 },
        constructionTime: 2,
        mass: 5,
        maxPower: 3,
    },
    [SolarConfiguration.Tier2Mobile]: {
        constructionCosts: { electrical: 80, structural: 15, energetical: 120 },
        constructionTime: 20,
        mass: 20,
        maxPower: 15,
    },
    [SolarConfiguration.Tier2Static]: {
        constructionCosts: { electrical: 120, structural: 50, energetical: 250 },
        constructionTime: 50,
        mass: 5000,
        maxPower: 35,
    },
};

export function getMaxSolarPower(config: UnitConfiguration) {
    if (!config.solar) {
        return 0;
    }

    return SOLAR_CHARACTERISTICS[config.solar].maxPower;
}
