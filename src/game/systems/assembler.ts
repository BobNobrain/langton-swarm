import { getAssemblerSpeed, getConstructionCosts, getConstructionTime, type UnitConfiguration } from '../config';
import type { BlueprintDeck, BlueprintId } from '../deck';
import type { UnitEnvironment, UnitId } from '../types';
import { createUnitEvent, type UnitEvent } from './events';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions, SpawnFn, UnitSystemTickContext } from './types';

export type AssemblerData = {
    readonly speed: number;

    currentSpawn: CurrentSpawnData | null;
    spawnQueue: SpawnQueueTask[];
    lastUpdated: number;
};

type SpawnQueueTask = {
    bp: { id: BlueprintId; v: number } | null;
    config: UnitConfiguration;
};
type CurrentSpawnData = SpawnQueueTask & {
    costs: Record<string, number>;
    started: number | null;
    timeToBuild: number;
    lastTimeCheckedForMats: number;
};

export type AssemblerSystemController = {
    getData(unitId: UnitId): AssemblerData | null;
    queue(unitId: UnitId, task: SpawnQueueTask): void;

    queueUpdated: UnitEvent<null>;
    spawned: UnitEvent<{ id: UnitId }>;
};

export const ASSEMBLER_SYSTEM_NAME = 'assembler';

export function createAssemblerSystem(
    opts: CreateUnitSystemCommonOptions,
    spawn: SpawnFn,
    positions: PositionalSystemController,
    inventory: InventoryController,
    deck: BlueprintDeck,
) {
    const system = createUnitSystem<AssemblerData, {}>(opts, {
        name: ASSEMBLER_SYSTEM_NAME,
        initialData({ config }) {
            if (!config.assembler) {
                return null;
            }

            return { speed: getAssemblerSpeed(config), spawnQueue: [], currentSpawn: null, lastUpdated: 0 };
        },

        tick(ctx, env) {
            const assembler = ctx.systemData;

            if (assembler.currentSpawn) {
                processCurrentSpawn(assembler.currentSpawn, ctx, env);
                return;
            }

            if (assembler.spawnQueue.length) {
                const { bp, config } = assembler.spawnQueue.shift()!;

                assembler.currentSpawn = {
                    bp,
                    config,
                    costs: getConstructionCosts(config),
                    started: null,
                    timeToBuild: getConstructionTime(config),
                    lastTimeCheckedForMats: -1,
                };

                assembler.lastUpdated = performance.now();
                controller.queueUpdated.pub({ unitId: ctx.unitId, payload: null });

                return;
            }

            ctx.sleep();
        },
    });

    const spawned = createUnitEvent<{ id: UnitId }>();
    opts.events.push(spawned);
    const queueUpdated = createUnitEvent<null>();
    opts.events.push(queueUpdated);

    const controller: AssemblerSystemController = {
        queue(unitId, task) {
            const assembler = system.getData(unitId);
            if (!assembler) {
                return;
            }

            assembler.spawnQueue.push(task);
            queueUpdated.pub({ unitId, payload: null });

            system.activate(unitId);

            if (task.bp) {
                deck.getBlueprint(task.bp.id)?.lockVersion(task.bp.v);
            }
        },

        getData: system.getData,
        queueUpdated,
        spawned,
    };

    function processCurrentSpawn(
        currentSpawn: CurrentSpawnData,
        ctx: UnitSystemTickContext<AssemblerData>,
        env: UnitEnvironment,
    ) {
        if (currentSpawn.started !== null) {
            if (currentSpawn.started + currentSpawn.timeToBuild <= env.currentTick) {
                const unitId = spawn({ at: positions.getEffectivePosition(ctx.unitId), config: currentSpawn.config });

                spawned.pub({ unitId: ctx.unitId, payload: { id: unitId } });

                if (currentSpawn.bp) {
                    registerUnit(deck, currentSpawn.bp, unitId);
                }

                ctx.systemData.currentSpawn = null;
                ctx.systemData.lastUpdated = performance.now();
                return;
            }

            ctx.sleep(currentSpawn.started + currentSpawn.timeToBuild - env.currentTick);
            return;
        }

        // TODO: get rid of checks every tick
        const invLastUpdated = inventory.getInfo(ctx.unitId)!.lastUpdated;
        if (invLastUpdated <= currentSpawn.lastTimeCheckedForMats) {
            return;
        }

        const hasEnoughMaterials = inventory.withdraw({
            from: ctx.unitId,
            amounts: currentSpawn.costs,
            tick: env.currentTick,
        });
        if (!hasEnoughMaterials) {
            currentSpawn.lastTimeCheckedForMats = env.currentTick;
            return;
        }

        currentSpawn.started = env.currentTick;
        ctx.systemData.lastUpdated = performance.now();
        ctx.sleep(currentSpawn.timeToBuild);
    }

    return { system, controller };
}

function registerUnit(deck: BlueprintDeck, bp: NonNullable<CurrentSpawnData['bp']>, unitId: UnitId) {
    const controller = deck.getBlueprint(bp.id);
    if (controller === null) {
        return;
    }

    controller.registerUnit(unitId, bp.v);
}
