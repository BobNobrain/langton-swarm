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
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SpawnFn, SpawnOptions } from './types';

export type ConstructionSiteData = {
    target: UnitConfiguration;
    matsRequired: InventoryDelta;
    pointsRequired: number;
    pointsSpent: number;
    deckInfo: {
        deck: BlueprintDeck;
        blueprint: BlueprintId;
        version?: number;
    } | null;
};

export type ConstructionSitesController = {
    spawnFromDeck(
        options: Omit<SpawnOptions, 'config'>,
        deck: BlueprintDeck,
        targetBlueprint: BlueprintId,
        targetVersion?: number,
    ): UnitId | null;
    findByLocation(location: NodeId): UnitId | null;
    isEnoughMaterials(site: UnitId): boolean;
    contributeAsMuchMaterialsAsPossible(opts: { site: UnitId; from: UnitId }): void;
    contributeTime(unitId: UnitId, points: number): { ok: boolean; done?: boolean };

    getProgress(unitId: UnitId): number;
    getMatsRequired(unitId: UnitId): InventoryDelta | null;

    progress: UnitEvent<number>;
};

export function createConstructionSitesSystem(
    opts: CreateUnitSystemCommonOptions,
    inventory: InventoryController,
    positions: PositionalSystemController,
    factions: FactionSystemController,
    spawn: SpawnFn,
    despawn: DespawnFn,
) {
    const byLocation = new Map<NodeId, UnitId>();

    const system = createUnitSystem<ConstructionSiteData, {}>(opts, {
        name: 'sites',

        initialData(options, unitId) {
            if (!options.config.construction) {
                return null;
            }

            byLocation.set(options.at, unitId);

            const target = options.config.construction;
            return {
                target,
                matsRequired: InventoryDelta.fromMany(getConstructionCosts(target)),
                pointsSpent: 0,
                pointsRequired: getConstructionPoints(target),
                deckInfo: null,
            };
        },

        finalize(ctx) {
            byLocation.delete(positions.getEffectivePosition(ctx.unitId));
        },
    });

    const controller: ConstructionSitesController = {
        progress: createUnitEvent(),

        spawnFromDeck(options, deck, targetBlueprint, targetVersion) {
            const targetConfig = deck.getConfiguration(targetBlueprint, targetVersion);
            if (!targetConfig) {
                return null;
            }

            const unitId = spawn({
                ...options,
                config: constructionSitePreset(targetConfig),
            });

            system.getData(unitId)!.deckInfo = {
                deck,
                blueprint: targetBlueprint,
                version: targetVersion,
            };

            return unitId;
        },

        findByLocation(location) {
            return byLocation.get(location) ?? null;
        },

        isEnoughMaterials(site) {
            const data = system.getData(site);
            if (!data) {
                return false;
            }

            const provided = InventoryDelta.fromMany(inventory.getInfo(site)!.contents);
            const required = data.matsRequired;
            return InventoryDelta.fulfillment(required, provided) >= 1;
        },

        contributeAsMuchMaterialsAsPossible({ site, from }) {
            const data = system.getData(site);
            if (!data) {
                return false;
            }

            const provided = InventoryDelta.fromMany(inventory.getInfo(site)!.contents);
            const required = data.matsRequired;
            const missing = InventoryDelta.combine(required, provided, 1, -1);

            inventory.transfer({
                from,
                to: site,
                amounts: missing.content,
                strategy: 'max',
            }) ?? {};
            return true;
        },

        contributeTime(unitId, points) {
            const site = system.getData(unitId);
            if (!site) {
                return { ok: false };
            }

            const { pointsRequired, pointsSpent } = site;
            const materialsProvided = InventoryDelta.fulfillment(
                site.matsRequired,
                InventoryDelta.fromMany(inventory.getInfo(unitId)!.contents),
            );

            const newPoints = Math.min(pointsSpent + points, pointsRequired);
            if (materialsProvided < newPoints / pointsRequired) {
                return { ok: false };
            }

            site.pointsSpent = newPoints;
            controller.progress.pub({ unitId: unitId, payload: site.pointsSpent / site.pointsRequired });

            let done = false;
            if (site.pointsSpent >= pointsRequired) {
                done = true;
                const location = positions.getEffectivePosition(unitId);
                const faction = factions.getFaction(unitId);
                inventory.withdraw({ from: unitId, amounts: site.matsRequired.content });

                despawn(unitId);

                if (site.deckInfo) {
                    spawnFromDeck(site.deckInfo.deck, spawn, location, site.deckInfo.blueprint, site.deckInfo.version);
                } else {
                    spawn({ at: location, config: site.target, faction });
                }
            }

            return { ok: true, done };
        },

        getProgress(unitId) {
            const site = system.getData(unitId);
            if (!site) {
                return 0;
            }

            return site.pointsSpent / site.pointsRequired;
        },
        getMatsRequired(unitId) {
            return system.getData(unitId)?.matsRequired ?? null;
        },
    };

    return { system, controller };
}
