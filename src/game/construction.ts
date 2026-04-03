import type { UnitConfiguration } from './types';
import type { KnownResourceName } from './worldgen/resources';

type ConfigSpecific<T> = {
    [key in keyof UnitConfiguration]-?: T | ((value: NonNullable<UnitConfiguration[key]>) => T);
};

const constructionTimes: ConfigSpecific<number> = {
    battery: 1,
    construction: 0,
    cpu: 1,
    drill: 2,
    engine: 1,
    mother: 100,
    navigator: 1,
    scanner: 1,
    storage: (storage) => Math.floor(storage.size / 100) + 1,
};

export function getConstructionTime(config: UnitConfiguration): number {
    let result = 0;

    for (const key of Object.keys(config) as (keyof UnitConfiguration)[]) {
        const value = config[key];
        if (value === undefined || value === null || value === false) {
            continue;
        }

        const time = constructionTimes[key];
        result += typeof time === 'number' ? time : time(value as never);
    }

    return result;
}

const constructionCosts: ConfigSpecific<{ [key in KnownResourceName]?: number }> = {
    battery: { copper: 1 },
    construction: {},
    cpu: { copper: 3, titanium: 1 },
    drill: { titanium: 3 },
    engine: { titanium: 1 },
    mother: { titanium: 100, copper: 200 },
    navigator: { titanium: 1, copper: 3 },
    scanner: { titanium: 1, copper: 1 },
    storage: (storage) => {
        const n = Math.floor(storage.size / 10) + 1;
        return { titanium: n };
    },
};

export function getConstructionCosts(config: UnitConfiguration): Record<string, number> {
    const result: Record<string, number> = {};

    for (const key of Object.keys(config) as (keyof UnitConfiguration)[]) {
        const value = config[key];
        if (value === undefined || value === null || value === false) {
            continue;
        }

        const costsFn = constructionCosts[key];
        const costs = typeof costsFn === 'function' ? costsFn(value as never) : costsFn;
        for (const key of Object.keys(costs) as Array<keyof typeof costs>) {
            result[key] ??= 0;
            result[key] += costs[key]!;
        }
    }

    return result;
}
