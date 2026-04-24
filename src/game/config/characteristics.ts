import { ASSEMBLER_CHARACTERISTICS } from './assembler';
import { BATTERY_CHARACTERISTICS } from './battery';
import { DRILL_CHARACTERISTICS } from './drill';
import { ENGINE_CHARACTERISTICS } from './engine';
import { SOLAR_CHARACTERISTICS } from './solar';
import { STORAGE_CHARACTERISTICS } from './storage';
import type { CommonCharacteristics, UnitConfiguration } from './types';

type AllCharacteristics = {
    [key in keyof UnitConfiguration]-?:
        | null
        | (UnitConfiguration[key] extends PropertyKey | undefined
              ? Record<NonNullable<UnitConfiguration[key]>, CommonCharacteristics>
              : CommonCharacteristics);
};

const ALL: AllCharacteristics = {
    battery: BATTERY_CHARACTERISTICS,
    construction: null,
    cpu: null,
    drill: DRILL_CHARACTERISTICS,
    engine: ENGINE_CHARACTERISTICS,
    navigator: {
        constructionCosts: { electrical: 5, structural: 1 },
        constructionTime: 1,
        mass: 1,
    },
    scanner: {
        constructionCosts: { electrical: 5, structural: 1, energetical: 1 },
        constructionTime: 1,
        mass: 1,
    },
    solar: SOLAR_CHARACTERISTICS,
    storage: STORAGE_CHARACTERISTICS,
    assembler: ASSEMBLER_CHARACTERISTICS,
};

function getAllCharacteristics(config: UnitConfiguration): CommonCharacteristics[] {
    const result: CommonCharacteristics[] = [];
    for (const key of Object.keys(config) as Array<keyof UnitConfiguration>) {
        const ch = ALL[key];
        if (ch === null) {
            continue;
        }

        const val = config[key];
        if (typeof val === 'string') {
            const specific = ch[val as never];

            if (specific) {
                result.push(specific);
            }
        } else if (val) {
            result.push(ch as CommonCharacteristics);
        }
    }
    return result;
}

export function getConstructionTime(config: UnitConfiguration): number {
    let result = 0;
    for (const next of getAllCharacteristics(config)) {
        result += next.constructionTime;
    }
    return result;
}

export function getConstructionCosts(config: UnitConfiguration, amount = 1): Record<string, number> {
    const result: Record<string, number> = {};

    for (const next of getAllCharacteristics(config)) {
        const costs = next.constructionCosts;
        for (const key of Object.keys(costs) as Array<keyof typeof costs>) {
            result[key] ??= 0;
            result[key] += costs[key]! * amount;
        }
    }

    return result;
}

export function getUnitMass(config: UnitConfiguration): number {
    let result = 0;
    for (const next of getAllCharacteristics(config)) {
        result += next.mass;
    }
    return result;
}
