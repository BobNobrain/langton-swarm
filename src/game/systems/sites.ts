import { getConstructionCosts, getConstructionPoints, type UnitConfiguration } from '../config';
import { constructionSitePreset } from '../config/presets';
import type { BlueprintDeck, BlueprintId } from '../deck';
import { InventoryDelta } from '../inventory';
import type { NodeId, UnitId } from '../types';
import { spawnFromDeck } from '../utils';
import { createUnitEvent, type UnitEvent } from './events';
import type { FactionSystemController } from './faction';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem, type UnitSystemTickContext } from './UnitSystem';

export type ConstructionSiteData = {
    target: UnitConfiguration;
    matsRequired: InventoryDelta;
    pointsRequired: number;
    pointsSpent: number;
    deckInfo: {
        blueprint: BlueprintId;
        version?: number;
    } | null;
    location: NodeId;
};

export type ConstructionSitesController = {
    spawnFromDeck(
        options: Omit<SpawnOptions, 'config' | 'blueprint'>,
        deck: BlueprintDeck,
        targetBlueprint: BlueprintId,
        targetVersion?: number,
    ): UnitId | null;
    findByLocation(location: NodeId): UnitId | null;
    isEnoughMaterials(site: UnitId): boolean;
    contributeAsMuchMaterialsAsPossible(opts: { site: UnitId; from: UnitId }): boolean;
    contributeTime(unitId: UnitId, points: number): { ok: boolean; done?: boolean };

    getProgress(unitId: UnitId): number;
    getMatsRequired(unitId: UnitId): InventoryDelta | null;

    progress: UnitEvent<number>;
};

type SaveData = {
    v: 1;
    byLoc: Map<NodeId, UnitId>;
};

export class ConstructionSitesSystem
    extends UnitSystem<ConstructionSiteData, SaveData>
    implements ConstructionSitesController
{
    readonly progress: UnitEvent<number>;
    private byLocation = new Map<NodeId, UnitId>();

    constructor(
        opts: UnitSystemOrchestrator,
        private inventory: InventoryController,
        private positions: PositionalSystemController,
        private factions: FactionSystemController,
    ) {
        super('sites', opts);

        if (this.loadedState) {
            this.byLocation = this.loadedState.byLoc;
        }

        this.registerEvent((this.progress = createUnitEvent()));
    }

    spawnFromDeck(
        options: Omit<SpawnOptions, 'config' | 'blueprint'>,
        deck: BlueprintDeck,
        targetBlueprint: BlueprintId,
        targetVersion?: number,
    ): UnitId | null {
        const targetConfig = deck.getConfiguration(targetBlueprint, targetVersion);
        if (!targetConfig) {
            return null;
        }

        const unitId = this.orchestrator.spawn({
            ...options,
            config: constructionSitePreset(targetConfig),
            blueprint: null,
        });

        this.getData(unitId)!.deckInfo = {
            blueprint: targetBlueprint,
            version: targetVersion,
        };

        return unitId;
    }
    findByLocation(location: NodeId): UnitId | null {
        return this.byLocation.get(location) ?? null;
    }
    isEnoughMaterials(site: UnitId): boolean {
        const data = this.getData(site);
        if (!data) {
            return false;
        }

        const provided = InventoryDelta.fromMany(this.inventory.getInfo(site)!.contents);
        const required = data.matsRequired;
        return InventoryDelta.fulfillment(required, provided) >= 1;
    }
    contributeAsMuchMaterialsAsPossible({ site, from }: { site: UnitId; from: UnitId }): boolean {
        const data = this.getData(site);
        if (!data) {
            return false;
        }

        const provided = InventoryDelta.fromMany(this.inventory.getInfo(site)!.contents);
        const required = data.matsRequired;
        const missing = InventoryDelta.combine(required, provided, 1, -1);

        this.inventory.transfer({
            from,
            to: site,
            amounts: missing.content,
            strategy: 'max',
        }) ?? {};

        return true;
    }
    contributeTime(unitId: UnitId, points: number): { ok: boolean; done?: boolean } {
        const site = this.getData(unitId);
        if (!site) {
            return { ok: false };
        }

        const { pointsRequired, pointsSpent } = site;
        const materialsProvided = InventoryDelta.fulfillment(
            site.matsRequired,
            InventoryDelta.fromMany(this.inventory.getInfo(unitId)!.contents),
        );

        const newPoints = Math.min(pointsSpent + points, pointsRequired);
        if (materialsProvided < newPoints / pointsRequired) {
            return { ok: false };
        }

        site.pointsSpent = newPoints;
        this.progress.pub({ unitId: unitId, payload: site.pointsSpent / site.pointsRequired });

        let done = false;
        if (site.pointsSpent >= pointsRequired) {
            done = true;
            this.turnIntoTarget(unitId, site);
        }

        return { ok: true, done };
    }
    getProgress(unitId: UnitId): number {
        const site = this.getData(unitId);
        if (!site) {
            return 0;
        }

        return site.pointsSpent / site.pointsRequired;
    }
    getMatsRequired(unitId: UnitId): InventoryDelta | null {
        return this.getData(unitId)?.matsRequired ?? null;
    }

    protected onSave(): SaveData {
        return { v: 1, byLoc: this.byLocation };
    }

    protected initialData({ config, at }: SpawnOptions, unitId: UnitId): ConstructionSiteData | null {
        if (!config.construction) {
            return null;
        }

        this.byLocation.set(at, unitId);

        const target = config.construction;
        return {
            target,
            matsRequired: InventoryDelta.fromMany(getConstructionCosts(target)),
            pointsSpent: 0,
            pointsRequired: getConstructionPoints(target),
            deckInfo: null,
            location: at,
        };
    }
    protected onFinalize(ctx: UnitSystemTickContext<ConstructionSiteData>): void {
        this.byLocation.delete(ctx.systemData.location);
    }

    private turnIntoTarget(siteId: UnitId, site: ConstructionSiteData) {
        const location = this.positions.getEffectivePosition(siteId);
        const faction = this.factions.getFaction(siteId);
        this.inventory.withdraw({ from: siteId, amounts: site.matsRequired.content });

        this.orchestrator.despawn(siteId);

        const deck = site.deckInfo ? this.factions.getFactionData(siteId)?.deck : null;
        if (deck) {
            spawnFromDeck(deck, this.orchestrator.spawn, location, site.deckInfo!.blueprint, site.deckInfo!.version);
        } else {
            this.orchestrator.spawn({ at: location, config: site.target, faction, blueprint: null });
        }
    }
}
