import type { Faction, FactionId, GameFactions } from '../factions';
import type { UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type FactionSystemData = FactionId;

export type FactionSystemController = {
    getFaction(unitId: UnitId): FactionId;
    getFactionData(unitId: UnitId): Faction | null;

    getAllUnits(fid: FactionId): Set<UnitId>;
};

export function createFactionsSystem(opts: CreateUnitSystemCommonOptions, factions: GameFactions) {
    const unitsByFaction = new Map<FactionId, Set<UnitId>>();

    const system = createUnitSystem(opts, {
        name: 'factions',
        initialData(options, unitId) {
            const units = unitsByFaction.getOrInsertComputed(options.faction, () => new Set());
            units.add(unitId);
            return options.faction;
        },
    });

    const controller: FactionSystemController = {
        getFaction: system.getData as FactionSystemController['getFaction'],
        getFactionData(unitId) {
            const fid = system.getData(unitId)!;
            return factions.getFaction(fid);
        },

        getAllUnits(fid) {
            return unitsByFaction.getOrInsertComputed(fid, () => new Set());
        },
    };

    return { system, controller };
}
