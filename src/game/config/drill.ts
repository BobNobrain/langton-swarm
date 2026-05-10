import { ResourceTier } from '../resources';
import type { CommonCharacteristics, UnitConfiguration } from './types';

export enum DrillConfiguration {
    Tier1 = 'TIER1',
    Tier2 = 'TIER2',
}

type DrillCharacteristics = CommonCharacteristics & {
    energyConsumption: number;
    maxDepositTier: ResourceTier;
    miningAmount: number;
    miningTime: number;
    miningRadius: number;
};

export const DRILL_CHARACTERISTICS: Record<DrillConfiguration, DrillCharacteristics> = {
    [DrillConfiguration.Tier1]: {
        constructionCosts: { electrical: 3, structural: 15 },
        constructionPoints: 20,
        mass: 3,
        energyConsumption: 5,
        maxDepositTier: ResourceTier.Tier1,
        miningAmount: 1,
        miningTime: 5,
        miningRadius: 1,
    },
    [DrillConfiguration.Tier2]: {
        constructionCosts: { electrical: 15, structural: 50 },
        constructionPoints: 200,
        mass: 10_000,
        energyConsumption: 50,
        maxDepositTier: ResourceTier.Tier2,
        miningAmount: 2,
        miningTime: 1,
        miningRadius: 2,
    },
};

export function getDrillProperties(config: UnitConfiguration): Omit<DrillCharacteristics, keyof CommonCharacteristics> {
    if (!config.drill) {
        return {
            energyConsumption: 0,
            maxDepositTier: 1,
            miningAmount: 0,
            miningTime: Infinity,
            miningRadius: 0,
        };
    }

    return DRILL_CHARACTERISTICS[config.drill];
}
