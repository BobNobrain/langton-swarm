import {
    getAssemblerSpeed,
    getConstructionCosts,
    getConstructionPoints,
    isStationary,
    type UnitConfiguration,
} from '../config';
import type { BlueprintController, BlueprintId } from '../deck';
import { InventoryDelta } from '../inventory';
import type { UnitId } from '../types';
import { createUnitEvent, type UnitEvent, type UnitEventData } from './events';
import type { FactionSystemController } from './faction';
import { usfSleep, usfHandlers, type CallableUnitSystemMessages, CallableUnitSystemFunctions, typedUSF } from './func';
import type { InventoryController, InventoryData } from './inventory';
import type { PositionalSystemController } from './positions';
import type { ConstructionSitesController } from './sites';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions, SpawnFn } from './types';

export type AssemblerData = {
    readonly speed: number;
    readonly requiresConstructionSite: boolean;

    currentSpawn: CurrentSpawnData | null;
    spawnQueue: SpawnQueueTask[];
};

type SpawnQueueTask = {
    bp: { controller: BlueprintController; v: number } | null;
    config: UnitConfiguration;
};
type CurrentSpawnData = SpawnQueueTask & {
    costs: Record<string, number>;
    // started: number | null;
    pointsToBuild: number;
    pointsSpent: number;
    resourcesConsumed: boolean;
};

export type AssemblerSystemController = {
    getData(unitId: UnitId): AssemblerData | null;
    queueBlueprint(
        unitId: UnitId,
        options: {
            blueprint: BlueprintId;
            version?: number;
        },
    ): void;

    queueUpdated: UnitEvent<SpawnQueueTask[]>;
    currentSpawnUpdated: UnitEvent<CurrentSpawnData | null>;
    spawned: UnitEvent<{ id: UnitId }>;
};

export const ASSEMBLER_SYSTEM_NAME = 'assembler';
const START_CONSTRUCTION_DELAY_TICKS = 5;

export const ASSEMBLER_FNS: CallableUnitSystemFunctions<
    AssemblerData,
    {
        positions: PositionalSystemController;
        factions: FactionSystemController;
        sites: ConstructionSitesController;
        inventory: InventoryController;
        controller: () => AssemblerSystemController;
        spawn: SpawnFn;
    }
> = {
    queue: typedUSF({
        description: 'Adds a blueprint into construction queue of the assembler',
        args: { target: 'blueprint' },
        returnType: 'number',
        *body(args, ctx, { controller }) {
            const assembler = ctx.systemData;
            if (assembler.requiresConstructionSite) {
                return { type: 'number', value: 0 };
            }

            controller().queueBlueprint(ctx.unitId, {
                blueprint: args.target.value,
            });

            return { type: 'number', value: assembler.spawnQueue.length };
        },
    }),

    is_assembling: {
        description: 'Allows to check if currently assembling a unit',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx) {
            const assembler = ctx.systemData;
            return { type: 'flag', value: assembler.currentSpawn !== null };
        },
    },
    queue_length: {
        description: 'Returns current assembling queue length',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx) {
            const assembler = ctx.systemData;
            return { type: 'number', value: assembler.spawnQueue.length };
        },
    },

    start_from_queue: {
        description: 'Removes the next item from assembling queue and starts assembling it',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { controller }) {
            const assembler = ctx.systemData;
            if (assembler.requiresConstructionSite || assembler.spawnQueue.length === 0) {
                return { type: 'flag', value: false };
            }

            const { bp, config } = assembler.spawnQueue.shift()!;
            assembler.currentSpawn = {
                bp,
                config,
                costs: getConstructionCosts(config),
                // started: null,
                pointsToBuild: getConstructionPoints(config),
                pointsSpent: 0,
                resourcesConsumed: false,
            };

            const { queueUpdated, currentSpawnUpdated } = controller();
            queueUpdated.pub({ unitId: ctx.unitId, payload: assembler.spawnQueue });
            currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: assembler.currentSpawn });

            return { type: 'flag', value: true };
        },
    },
    finish_assembling: {
        description: 'Finishes assembling current item, if possible',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { inventory, spawn, positions, factions, controller }) {
            const assembler = ctx.systemData;
            if (!assembler.currentSpawn) {
                return { type: 'flag', value: false };
            }

            const current = assembler.currentSpawn;
            const costs = current.costs;
            const ctrl = controller();
            if (!inventory.withdraw({ from: ctx.unitId, amounts: costs })) {
                return { type: 'flag', value: false };
            }

            current.resourcesConsumed = true;
            ctrl.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: current });

            while (current.pointsSpent < current.pointsToBuild) {
                yield usfSleep();
                if (current !== assembler.currentSpawn) {
                    console.error('Somebody snatched current spawn', { unit: ctx.unitId, assembler, current });
                    return { type: 'flag', value: false };
                }

                current.pointsSpent = Math.min(current.pointsToBuild, current.pointsSpent + assembler.speed);
                ctrl.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: current });
            }

            assembler.currentSpawn = null;
            ctrl.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: null });

            const unitId = spawn({
                at: positions.getEffectivePosition(ctx.unitId),
                config: current.config,
                faction: factions.getFaction(ctx.unitId),
            });

            ctrl.spawned.pub({ unitId: ctx.unitId, payload: { id: unitId } });

            if (current.bp) {
                current.bp.controller.registerUnit(unitId, current.bp.v);
            }

            return { type: 'flag', value: true };
        },
    },

    get_site_missing_materials: {
        description: 'Returns how much materials are still needed to construct the site',
        argNames: [],
        argTypes: [],
        returnType: 'inventory',
        *body(_, ctx, { sites, positions, inventory }) {
            const site = sites.findByLocation(positions.getEffectivePosition(ctx.unitId));
            let result: InventoryDelta | null = null;

            if (site) {
                const required = sites.getMatsRequired(site)!;
                const got = InventoryDelta.fromMany(inventory.getInfo(site)?.contents ?? {});
                result = InventoryDelta.abs(InventoryDelta.combine(required, got, 1, -1));
            }

            return { type: 'inventory', value: result ?? InventoryDelta.empty() };
        },
    },

    get_costs: typedUSF({
        description: 'Returns amounts of materials needed to assemble specified blueprint',
        args: { blueprint: 'blueprint' },
        returnType: 'inventory',
        *body(args, ctx, { factions }) {
            const blueprintId = args.blueprint;
            const deck = factions.getFactionData(ctx.unitId)?.deck ?? null;
            let result: InventoryDelta | null = null;

            if (deck) {
                const blueprint = deck.getBlueprint(blueprintId.value);

                if (blueprint) {
                    const config = blueprint.rLastVersion().config;
                    const costs = getConstructionCosts(config);
                    result = InventoryDelta.fromMany(costs);
                }
            }

            return { type: 'inventory', value: result ?? InventoryDelta.empty() };
        },
    }),

    create_construction_site: typedUSF({
        description: 'Starts a construction site for given blueprint',
        args: { blueprint: 'blueprint' },
        returnType: 'flag',
        *body(args, ctx, { sites, positions, factions }) {
            const blueprintId = args.blueprint;
            const deck = factions.getFactionData(ctx.unitId)?.deck ?? null;
            let success = false;

            if (deck) {
                yield usfSleep(START_CONSTRUCTION_DELAY_TICKS);
                // TODO: maybe require like 5 structural resources to build the site?
                const unitId = sites.spawnFromDeck(
                    {
                        at: positions.getEffectivePosition(ctx.unitId),
                        faction: factions.getFaction(ctx.unitId),
                    },
                    deck,
                    blueprintId.value,
                );
                success = unitId !== null;
            }

            return { type: 'flag', value: success };
        },
    }),

    finish_construction: {
        description:
            'If the unit is at a construction site and has enough inventory, completes the construction of the site',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { sites, positions }) {
            const site = sites.findByLocation(positions.getEffectivePosition(ctx.unitId));
            if (!site) {
                return { type: 'flag', value: false };
            }

            const assembler = ctx.systemData;

            while (true) {
                const construction = sites.contributeTime(site, assembler.speed);
                if (!construction.ok) {
                    return { type: 'flag', value: false };
                }
                if (construction.done) {
                    return { type: 'flag', value: true };
                }

                yield usfSleep();
            }
        },
    },
};

export function createAssemblerSystem(
    opts: CreateUnitSystemCommonOptions,
    spawn: SpawnFn,
    positions: PositionalSystemController,
    inventory: InventoryController,
    factions: FactionSystemController,
    sites: ConstructionSitesController,
) {
    const system = createUnitSystem<AssemblerData, CallableUnitSystemMessages>(opts, {
        name: ASSEMBLER_SYSTEM_NAME,
        initialData({ config }) {
            if (!config.assembler) {
                return null;
            }

            return {
                speed: getAssemblerSpeed(config),
                requiresConstructionSite: !isStationary(config),
                spawnQueue: [],
                currentSpawn: null,
            };
        },

        messages: {
            ...usfHandlers(ASSEMBLER_FNS, {
                positions,
                factions,
                sites,
                inventory,
                controller: () => controller,
                spawn,
            }),
        },
    });

    const spawned = createUnitEvent<{ id: UnitId }>();
    opts.events.push(spawned);
    const queueUpdated = createUnitEvent<SpawnQueueTask[]>();
    opts.events.push(queueUpdated);
    const currentSpawnUpdated = createUnitEvent<CurrentSpawnData | null>();
    opts.events.push(currentSpawnUpdated);

    const controller: AssemblerSystemController = {
        queueBlueprint(unitId, { blueprint, version }) {
            const assembler = system.getData(unitId);
            if (!assembler) {
                return;
            }

            const deck = factions.getFactionData(unitId)?.deck;
            if (!deck) {
                return;
            }

            const bpController = deck.getBlueprint(blueprint);
            const config = deck.getConfiguration(blueprint, version);
            if (!bpController || !config) {
                return;
            }

            version ??= bpController.rLastVersion().version;

            assembler.spawnQueue.push({
                bp: {
                    controller: bpController,
                    v: version,
                },
                config,
            });

            queueUpdated.pub({ unitId, payload: assembler.spawnQueue });
            system.activate(unitId);
            bpController.lockVersion(version);
        },

        getData: system.getData,
        queueUpdated,
        spawned,
        currentSpawnUpdated,
    };

    return { system, controller };
}
