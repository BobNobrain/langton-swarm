import { type Faction, type FactionId, type GameFactions, NO_FACTION } from '../factions';
import type { UnitId } from '../types';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem } from './UnitSystem';

export type FactionSystemController = {
    getFaction(unitId: UnitId): FactionId;
    getFactionData(unitId: UnitId): Faction | null;

    getAllUnits(fid: FactionId): Set<UnitId>;
};

type SaveData = {
    v: 1;
    bf: Map<FactionId, Set<UnitId>>;
};

export class FactionsSystem extends UnitSystem<FactionId, SaveData> implements FactionSystemController {
    private unitsByFaction = new Map<FactionId, Set<UnitId>>();

    constructor(
        opts: UnitSystemOrchestrator,
        private factions: GameFactions,
    ) {
        super('factions', opts);

        if (this.loadedState) {
            this.unitsByFaction = this.loadedState.bf;
        }
    }

    getFaction(unitId: UnitId): FactionId {
        return this.getData(unitId) ?? NO_FACTION;
    }
    getFactionData(unitId: UnitId): Faction | null {
        const fid = this.getData(unitId)!;
        return this.factions.getFaction(fid);
    }
    getAllUnits(fid: FactionId): Set<UnitId> {
        return this.unitsByFaction.getOrInsertComputed(fid, () => new Set());
    }

    protected initialData(options: SpawnOptions, unitId: UnitId): (number & { __idTag__: 'FactionId' }) | null {
        const units = this.unitsByFaction.getOrInsertComputed(options.faction, () => new Set());
        units.add(unitId);
        return options.faction;
    }

    protected onSave(): SaveData {
        return { v: 1, bf: this.unitsByFaction };
    }
}
