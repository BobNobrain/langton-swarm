import type { FactionId } from '../factions';
import type { UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type FactionSystemData = FactionId;

export type FactionSystemController = {
    getFaction(unitId: UnitId): FactionId;
};

export function createFactionsSystem(opts: CreateUnitSystemCommonOptions) {
    const system = createUnitSystem(opts, {
        name: 'factions',
        initialData(options) {
            return options.faction;
        },
    });

    const controller: FactionSystemController = {
        getFaction: system.getData as FactionSystemController['getFaction'],
    };

    return { system, controller };
}
