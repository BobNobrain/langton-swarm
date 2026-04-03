import { isStationary } from '../config';
import { getConstructionCosts, getConstructionTime } from '../construction';
import type { BlueprintController, BlueprintDeck, BlueprintVersion } from '../deck';
import type { UnitCommand, UnitEnvironment } from '../types';
import type { InventoryController } from './inventory';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions, SpawnFn, UnitSystemTickContext } from './types';

export type MotherData = {
    unitsSpawned: number;
    currentSpawn: CurrentSpawnData | null;
    spawnQueue: SpawnQueueTask[];
    lastUpdated: number;
};

type MotherDeps = {
    deck: BlueprintDeck;
    spawn: SpawnFn;
    inventory: InventoryController;
};

type SpawnQueueTask = {
    bp: BlueprintController;
    version: BlueprintVersion;
};
type CurrentSpawnData = {
    bp: BlueprintController;
    version: BlueprintVersion;
    costs: Record<string, number>;
    started: number | null;
    timeToBuild: number;
    lastTimeCheckedForMats: number;
};

const MOTHER_SYSTEM_NAME = 'mother';

const MOTHER_COMMANDS: UnitCommand[] = [
    {
        name: 'spawn',
        args: [
            {
                name: 'blueprint',
                type: 'blueprint',
                defaultValue: null,
            },
        ],
    },
];

export function createMotherSystem(opts: CreateUnitSystemCommonOptions, { deck, spawn, inventory }: MotherDeps) {
    function processCurrentSpawn(
        currentSpawn: CurrentSpawnData,
        ctx: UnitSystemTickContext<MotherData>,
        env: UnitEnvironment,
    ) {
        if (currentSpawn.started !== null) {
            if (currentSpawn.started + currentSpawn.timeToBuild <= env.currentTick) {
                const unitId = spawn({ at: ctx.state.location, config: currentSpawn.version.config });
                currentSpawn.bp.registerUnit(unitId, currentSpawn.version.version);

                ++ctx.systemData.unitsSpawned;
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

    return createUnitSystem<MotherData, {}>(opts, {
        name: MOTHER_SYSTEM_NAME,
        messages: {},

        initialData(config, state) {
            if (!config.mother) {
                return null;
            }

            return { unitsSpawned: 0, spawnQueue: [], currentSpawn: null, lastUpdated: 0 };
        },
        tick(ctx, env) {
            const mother = ctx.systemData;

            if (mother.currentSpawn) {
                processCurrentSpawn(mother.currentSpawn, ctx, env);
                return;
            }

            if (mother.spawnQueue.length) {
                const { bp, version } = mother.spawnQueue.shift()!;
                bp.lockVersion(version.version);
                const config = version.config;

                mother.currentSpawn = {
                    bp,
                    version,
                    costs: getConstructionCosts(config),
                    started: null,
                    timeToBuild: getConstructionTime(config),
                    lastTimeCheckedForMats: -1,
                };
                mother.lastUpdated = performance.now();
                return;
            }

            ctx.sleep();
        },

        queryCommands() {
            return MOTHER_COMMANDS;
        },
        executeCommand(call, ctx, env) {
            switch (call.name) {
                case 'spawn': {
                    const bpid = call.args[0];
                    if (!bpid || bpid.type !== 'blueprint') {
                        break;
                    }

                    const bp = deck.getBlueprint(bpid.value);
                    if (!bp) {
                        break;
                    }

                    const version = bp.rLastVersion();
                    if (isStationary(version.config)) {
                        break;
                    }

                    ctx.systemData.spawnQueue.push({ bp, version });
                    ctx.systemData.lastUpdated = performance.now();
                    return true;
                }
            }

            return false;
        },

        hasCommand(name) {
            return name === 'spawn';
        },
    });
}
