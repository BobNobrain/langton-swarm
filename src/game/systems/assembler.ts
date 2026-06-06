import {
    getAssemblerSpeed,
    getConstructionCosts,
    getConstructionPoints,
    isStationary,
    type UnitConfiguration,
} from '../config';
import type { BlueprintId } from '../deck';
import { InventoryDelta } from '../inventory';
import type { UnitId } from '../types';
import { createUnitEvent, type UnitEvent } from './events';
import type { FactionSystemController } from './faction';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
import type { ConstructionSitesController } from './sites';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { fnReturn, fnSleep, UnitSystem } from './UnitSystem';

export type AssemblerData = {
    readonly speed: number;
    readonly requiresConstructionSite: boolean;

    currentSpawn: CurrentSpawnData | null;
    spawnQueue: SpawnQueueTask[];
};

type SpawnQueueTask = {
    bp: { id: BlueprintId; v: number } | null;
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

export const ASSEMBLER_FNS = {
    queue: UnitSystem.declareFn({
        name: 'queue',
        args: { target: 'blueprint' },
        returnType: 'number',
        description: 'Adds a blueprint into construction queue of the assembler',
    }),

    is_assembling: UnitSystem.declareFn({
        name: 'is_assembling',
        args: {},
        returnType: 'flag',
        description: 'Allows to check if currently assembling a unit',
    }),
    queue_length: UnitSystem.declareFn({
        name: 'queue_length',
        args: {},
        returnType: 'number',
        description: 'Returns current assembling queue length',
    }),

    start_from_queue: UnitSystem.declareFn({
        name: 'start_from_queue',
        args: {},
        returnType: 'flag',
        description: 'Removes the next item from assembling queue and starts assembling it',
    }),
    finish_assembling: UnitSystem.declareFn({
        name: 'finish_assembling',
        args: {},
        returnType: 'flag',
        description: 'Finishes assembling current item, if possible',
    }),

    get_site_missing_materials: UnitSystem.declareFn({
        name: 'get_site_missing_materials',
        args: {},
        returnType: 'inventory',
        description: 'Returns how much materials are still needed to construct the site',
    }),

    get_costs: UnitSystem.declareFn({
        name: 'get_costs',
        args: { blueprint: 'blueprint' },
        returnType: 'inventory',
        description: 'Returns amounts of materials needed to assemble specified blueprint',
    }),

    create_construction_site: UnitSystem.declareFn({
        name: 'create_construction_site',
        args: { blueprint: 'blueprint' },
        returnType: 'flag',
        description: 'Starts a construction site for given blueprint',
    }),

    finish_construction: UnitSystem.declareFn({
        name: 'finish_construction',
        args: {},
        returnType: 'flag',
        description:
            'If the unit is at a construction site and has enough inventory, completes the construction of the site',
    }),
} as const;

export class AssemblerSystem extends UnitSystem<AssemblerData> implements AssemblerSystemController {
    public readonly queueUpdated: UnitEvent<SpawnQueueTask[]>;
    public readonly currentSpawnUpdated: UnitEvent<CurrentSpawnData | null>;
    public readonly spawned: UnitEvent<{ id: UnitId }>;

    constructor(
        opts: UnitSystemOrchestrator,
        positions: PositionalSystemController,
        inventory: InventoryController,
        private factions: FactionSystemController,
        sites: ConstructionSitesController,
    ) {
        super(ASSEMBLER_SYSTEM_NAME, opts);

        this.registerEvent((this.queueUpdated = createUnitEvent()));
        this.registerEvent((this.currentSpawnUpdated = createUnitEvent()));
        this.registerEvent((this.spawned = createUnitEvent()));

        this.registerFn(ASSEMBLER_FNS.queue).implement((state, ctx) => {
            const assembler = ctx.systemData;
            if (assembler.requiresConstructionSite) {
                return fnReturn({ type: 'number', value: 0 });
            }

            this.queueBlueprint(ctx.unitId, {
                blueprint: state.args.target.value,
            });

            return fnReturn({ type: 'number', value: assembler.spawnQueue.length });
        });

        this.registerFn(ASSEMBLER_FNS.queue_length).implement((_, ctx) => {
            return fnReturn({ type: 'number', value: ctx.systemData.spawnQueue.length });
        });

        this.registerFn(ASSEMBLER_FNS.is_assembling).implement((_, ctx) => {
            return fnReturn({ type: 'flag', value: ctx.systemData.currentSpawn !== null });
        });

        this.registerFn(ASSEMBLER_FNS.start_from_queue).implement((_, ctx) => {
            const assembler = ctx.systemData;
            if (assembler.requiresConstructionSite || assembler.spawnQueue.length === 0) {
                return fnReturn({ type: 'flag', value: false });
            }

            const { bp, config } = assembler.spawnQueue.shift()!;
            assembler.currentSpawn = {
                bp,
                config,
                costs: getConstructionCosts(config),
                pointsToBuild: getConstructionPoints(config),
                pointsSpent: 0,
                resourcesConsumed: false,
            };

            this.queueUpdated.pub({ unitId: ctx.unitId, payload: assembler.spawnQueue });
            this.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: assembler.currentSpawn });

            return fnReturn({ type: 'flag', value: true });
        });

        this.registerFn(ASSEMBLER_FNS.finish_assembling).implement((_, ctx) => {
            const assembler = ctx.systemData;
            if (!assembler.currentSpawn) {
                return fnReturn({ type: 'flag', value: false });
            }

            const current = assembler.currentSpawn;

            if (!current.resourcesConsumed) {
                // consuming resources
                const costs = current.costs;
                if (!inventory.withdraw({ from: ctx.unitId, amounts: costs })) {
                    return fnReturn({ type: 'flag', value: false });
                }

                current.resourcesConsumed = true;
                this.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: current });
                return fnSleep();
            }

            if (current.pointsSpent < current.pointsToBuild) {
                // still working on assembly
                current.pointsSpent = Math.min(current.pointsToBuild, current.pointsSpent + assembler.speed);
                this.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: current });

                return fnSleep();
            }

            // assembly done, spawn the unit and clear currentSpawn
            assembler.currentSpawn = null;
            this.currentSpawnUpdated.pub({ unitId: ctx.unitId, payload: null });

            const unitId = this.orchestrator.spawn({
                at: positions.getEffectivePosition(ctx.unitId),
                config: current.config,
                faction: factions.getFaction(ctx.unitId),
                blueprint: current.bp ? { id: current.bp.id, version: current.bp.v } : null,
            });

            this.spawned.pub({ unitId: ctx.unitId, payload: { id: unitId } });

            return fnReturn({ type: 'flag', value: true });
        });

        this.registerFn(ASSEMBLER_FNS.get_site_missing_materials).implement((_, ctx) => {
            const site = sites.findByLocation(positions.getEffectivePosition(ctx.unitId));
            let result: InventoryDelta | null = null;

            if (site) {
                const required = sites.getMatsRequired(site)!;
                const got = InventoryDelta.fromMany(inventory.getInfo(site)?.contents ?? {});
                result = InventoryDelta.abs(InventoryDelta.combine(required, got, 1, -1));
            }

            return fnReturn({ type: 'inventory', value: result ?? InventoryDelta.empty() });
        });

        this.registerFn(ASSEMBLER_FNS.get_costs).implement(({ args }, ctx) => {
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

            return fnReturn({ type: 'inventory', value: result ?? InventoryDelta.empty() });
        });

        this.registerFn(ASSEMBLER_FNS.create_construction_site).implement<{
            startDelayDone?: boolean;
        }>((state, ctx) => {
            const blueprintId = state.args.blueprint;
            const deck = factions.getFactionData(ctx.unitId)?.deck ?? null;

            if (!deck) {
                return fnReturn({ type: 'flag', value: false });
            }

            if (!state.startDelayDone) {
                state.startDelayDone = true;
                return fnSleep(START_CONSTRUCTION_DELAY_TICKS);
            }

            // TODO: maybe require like 5 structural resources to build the site?
            const unitId = sites.spawnFromDeck(
                {
                    at: positions.getEffectivePosition(ctx.unitId),
                    faction: factions.getFaction(ctx.unitId),
                },
                deck,
                blueprintId.value,
            );

            return fnReturn({ type: 'flag', value: unitId !== null });
        });

        this.registerFn(ASSEMBLER_FNS.finish_construction).implement((state, ctx) => {
            const site = sites.findByLocation(positions.getEffectivePosition(ctx.unitId));
            if (!site) {
                return fnReturn({ type: 'flag', value: false });
            }

            const assembler = ctx.systemData;
            const construction = sites.contributeTime(site, assembler.speed);

            if (!construction.ok) {
                return fnReturn({ type: 'flag', value: false });
            }

            if (construction.done) {
                return fnReturn({ type: 'flag', value: true });
            }

            return fnSleep();
        });
    }

    queueBlueprint(
        unitId: UnitId,
        {
            blueprint,
            version,
        }: {
            blueprint: BlueprintId;
            version?: number;
        },
    ): void {
        const assembler = this.getData(unitId);
        if (!assembler) {
            return;
        }

        const deck = this.factions.getFactionData(unitId)?.deck;
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
                id: blueprint,
                v: version,
            },
            config,
        });

        this.queueUpdated.pub({ unitId, payload: assembler.spawnQueue });
        this.activate(unitId);
        bpController.lockVersion(version);
    }

    protected initialData({ config }: SpawnOptions): AssemblerData | null {
        if (!config.assembler) {
            return null;
        }

        return {
            speed: getAssemblerSpeed(config),
            requiresConstructionSite: !isStationary(config),
            spawnQueue: [],
            currentSpawn: null,
        };
    }
}
