import { getAssemblerSpeed } from './assembler';
import { getConstructionPoints, getUnitMass } from './characteristics';
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

    return !Number.isFinite(getStorageCapacity({ storage })) && isConfigEmpty(rest);
}

export function isConstructionSite({ construction, storage, ...rest }: UnitConfiguration): boolean {
    return Boolean(construction) && Boolean(storage) && isConfigEmpty(rest);
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

export function getConstructionTimeTicks({
    target,
    assembler,
}: {
    target: UnitConfiguration;
    assembler: UnitConfiguration;
}): number {
    const pointsPerTick = getAssemblerSpeed(assembler);
    const pointsTotal = getConstructionPoints(target);
    return Math.ceil(pointsTotal / pointsPerTick);
}

function isConfigEmpty(config: UnitConfiguration): boolean {
    return Object.values(config).every((value) => value === undefined || value === null || value === false);
}
