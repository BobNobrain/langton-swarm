import { sequentialId } from '@/lib/ids';
import type { BlueprintDeck } from '../deck';
import type { GameLoop } from '../loop';
import type {
    NodeId,
    UnitCommand,
    UnitCommandCall,
    UnitConfiguration,
    UnitEnvironment,
    UnitId,
    UnitState,
} from '../types';
import type { GameWorld } from '../world';
import { createCPUSystem, type CPUData } from './cpu';
import { createDrillSystem } from './drill';
import { createEngineSystem } from './engine';
import { createInventorySystem, type InventoryController } from './inventory';
import { createMotherSystem, type MotherData } from './mother';
import { createNavigatorSystem, type NavigatorSystemData } from './navigator';
import { createScannerSystem, type ScannerData } from './scanner';
import { createSignalsSystem } from './signals';
import { createStationariesSystem } from './stationaries';
import type { UnitSystem, UnitSystemPublic } from './systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SendMessage, SpawnFn, UnitSystemMessage } from './types';

export type GameUnitSystems = {
    readonly signals: Pick<ReturnType<typeof createSignalsSystem>, 'getUnitIdsSignal'>;
    readonly unitStates: Readonly<Record<string, UnitState>>;

    readonly inventory: InventoryController;
    readonly mother: UnitSystemPublic<MotherData>;
    readonly cpu: UnitSystemPublic<CPUData>;
    readonly navigator: UnitSystemPublic<NavigatorSystemData>;
    readonly scanner: UnitSystemPublic<ScannerData>;

    readonly debug: unknown;

    spawn: SpawnFn;
    despawn: DespawnFn;

    queryCommands(unitId: UnitId): UnitCommand[];
    executeCommand(unitId: UnitId, call: UnitCommandCall): void;
    executeCommandMany(unitIds: UnitId[], call: UnitCommandCall): void;
    findByLocation(location: NodeId | Set<NodeId>): UnitId[];
    getLastUpdatedTime(id: UnitId): number;
    getConfig(id: UnitId): UnitConfiguration | null;
};

export function createGameSystems(world: GameWorld, deck: BlueprintDeck, logicTick: GameLoop): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: { to: string; message: UnitSystemMessage; notUntil?: number }[] = [];

    const unitId = sequentialId<UnitId>();
    const unitStates: Record<UnitId, UnitState> = {};
    const unitUpdateTimes: Record<UnitId, number> = {};
    const unitConfigs: Record<UnitId, UnitConfiguration> = {};

    const env: UnitEnvironment = {
        currentTick: -1,
    };

    const sendMessage: SendMessage = (to, message, delay) => {
        messageQueue.push({ to, message, notUntil: delay ? env.currentTick + delay : undefined });
    };

    const spawn: SpawnFn = ({ at, config }) => {
        console.log('[DEBUG] spawn:', at.toString(16), config);
        const id = unitId.aquire();
        const state: UnitState = { location: at };

        unitStates[id] = state;
        unitUpdateTimes[id] = -1;
        unitConfigs[id] = config;

        for (const system of Object.values(systems)) {
            system.create(id, config, state);
        }

        return id;
    };
    const despawn: DespawnFn = (unitId) => {
        console.log('[DEBUG] despawn:', unitId);
        const state = unitStates[unitId];
        if (!state) {
            return;
        }

        for (const system of Object.values(systems)) {
            system.remove(unitId);
        }

        delete unitStates[unitId];
        delete unitUpdateTimes[unitId];
        delete unitConfigs[unitId];
    };

    const updateUnitState = (id: UnitId, patch: Partial<UnitState>) => {
        Object.assign(unitStates[id], patch);
        unitUpdateTimes[id] = env.currentTick;
    };

    const opts: CreateUnitSystemCommonOptions = { env, states: unitStates, sendMessage, updateUnitState };

    const cpu = createCPUSystem(opts);
    const engine = createEngineSystem(opts, world);
    const [stationariesSystem, stationaries] = createStationariesSystem(opts, { despawn });
    const [inventorySystem, inventoryController] = createInventorySystem(opts, stationaries, spawn, despawn);
    const mother = createMotherSystem(opts, { deck, spawn, inventory: inventoryController });
    const signals = createSignalsSystem(opts);
    const drill = createDrillSystem(opts, world, inventoryController);
    const scanner = createScannerSystem(opts, world, inventoryController);
    const navigator = createNavigatorSystem(opts, world);

    systems[cpu.name] = cpu;
    systems[engine.name] = engine;
    systems[mother.name] = mother;
    systems[signals.name] = signals;
    systems[stationariesSystem.name] = stationariesSystem;
    systems[inventorySystem.name] = inventorySystem;
    systems[drill.name] = drill;
    systems[scanner.name] = scanner;
    systems[navigator.name] = navigator;

    logicTick.addGameTask((tick) => {
        // main unit update loop
        // update the env object
        env.currentTick = tick;

        // tick all the components, in order
        cpu.tick();
        mother.tick();
        inventorySystem.tick();
        stationariesSystem.tick();

        // process all the messages to activate the components
        const pending: typeof messageQueue = [];
        for (const msg of messageQueue) {
            if (tick < (msg.notUntil ?? 0)) {
                pending.push(msg);
                continue;
            }

            const system = systems[msg.to];
            system.handleMessage(msg.message);
        }

        messageQueue.length = 0;
        messageQueue.push(...pending);
    });

    return {
        signals,
        unitStates,
        debug: { systems, messageQueue },

        spawn,
        despawn,

        inventory: inventoryController,
        mother,
        cpu,
        navigator,
        scanner,

        queryCommands(unitId) {
            if (cpu.has(unitId)) {
                return cpu.queryCommands(unitId);
            } else if (mother.has(unitId)) {
                return mother.queryCommands(unitId);
            }

            return [];
        },

        executeCommand(unitId, call) {
            if (mother.has(unitId)) {
                mother.handleCommand(unitId, call);
                return;
            }

            cpu.handleCommand(unitId, call);
        },

        executeCommandMany(unitIds, call) {
            for (const unitId of unitIds) {
                if (mother.has(unitId)) {
                    mother.handleCommand(unitId, call);
                    continue;
                }

                cpu.handleCommand(unitId, call);
            }
        },

        findByLocation(locationOrLocations) {
            // TODO: cache or something
            const result: UnitId[] = [];
            const locations = locationOrLocations instanceof Set ? locationOrLocations : new Set([locationOrLocations]);
            for (const [id, state] of Object.entries(unitStates)) {
                if (locations.has(state.location)) {
                    result.push(Number(id) as UnitId);
                }
            }
            return result;
        },

        getLastUpdatedTime(id) {
            return unitUpdateTimes[id] ?? -1;
        },

        getConfig(id) {
            return unitConfigs[id] ?? null;
        },
    };
}

export type { CPUData, NavigatorSystemData, MotherData, ScannerData };
export { UnitModelType } from './signals';
export { type InventoryController, type InventoryData } from './inventory';
