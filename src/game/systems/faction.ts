import type { Faction, FactionId, GameFactions } from '../factions';
import type { UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type FactionSystemData = FactionId;

export type FactionSystemController = {
    getFaction(unitId: UnitId): FactionId;
    getFactionData(unitId: UnitId): Faction | null;
};

export function createFactionsSystem(opts: CreateUnitSystemCommonOptions, factions: GameFactions) {
    const system = createUnitSystem(opts, {
        name: 'factions',
        initialData(options) {
            return options.faction;
        },
    });

    const controller: FactionSystemController = {
        getFaction: system.getData as FactionSystemController['getFaction'],
        getFactionData(unitId) {
            const fid = system.getData(unitId)!;
            return factions.getFaction(fid);
        },
    };

    return { system, controller };
}
