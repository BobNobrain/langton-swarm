import type { UnitConfiguration } from './types';

export function getProcessorTickRate(config: UnitConfiguration): number {
    return 4; // every 4 ticks, so 5 times per second
}

export function isStationary(config: UnitConfiguration): boolean {
    return !config.engine;
}

export function isPile({ storage, ...rest }: UnitConfiguration): boolean {
    if (!storage) {
        return false;
    }

    return (
        !Number.isFinite(storage.size) &&
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

    if (config.mother && result < 5) {
        result = 5;
    }

    return result;
}

export function getTicksPerMove(config: UnitConfiguration): number {
    if (!config.engine) {
        return 0;
    }

    return 6 / config.engine.power;
}
