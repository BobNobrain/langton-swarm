import { getUnitMass } from './characteristics';
import { ENGINE_CHARACTERISTICS } from './engine';
import { getStorageCapacity } from './storage';
import type { UnitConfiguration } from './types';

export function isStationary(config: UnitConfiguration): boolean {
    return !config.engine;
}

export function isPile({ storage, ...rest }: UnitConfiguration): boolean {
    if (!storage) {
        return false;
    }

    return (
        !Number.isFinite(getStorageCapacity({ storage })) &&
        Object.values(rest).every((value) => value === undefined || value === null || value === false)
    );
}

export function getDiscoveryRange(config: UnitConfiguration): number {
    let result = 2;
    if (isStationary(config)) {
        result += 2;
    }

    if (config.scanner || config.navigator) {
        result += 1;
    }

    return result;
}

export function getTicksPerMove(config: UnitConfiguration): number {
    if (!config.engine) {
        return 0;
    }

    const chars = ENGINE_CHARACTERISTICS[config.engine];
    const mass = getUnitMass(config);
    const power = chars.power;

    return Math.ceil((mass / power) * 0.1) * 3;
}
