import { sequentialId } from '@/lib/ids';
import type { UnitConfiguration } from '../config';
import type { BlueprintDeck } from '../deck';
import type { GameLoop } from '../loop';
import type { NodeId, UnitCommand, UnitCommandCall, UnitEnvironment, UnitId, UnitState } from '../types';
import type { GameWorld } from '../world';
import { createAssemblerSystem, type AssemblerSystemController } from './assembler';
import { createCPUSystem, type CPUData } from './cpu';
import { createDiscoverySystem } from './discovery';
import { createDrillSystem } from './drill';
import { createEnergySystem, type EnergySystemController } from './energy';
import { createEngineSystem } from './engine';
import { createUnitEvent, type UnitEventController } from './events';
import { createInventorySystem, type InventoryController } from './inventory';
// import { createMotherSystem, type MotherData } from './mother';
import { createNavigatorSystem, type NavigatorSystemData } from './navigator';
import { createScannerSystem, type ScannerData } from './scanner';
import { createSignalsSystem } from './signals';
import { createSolarSystem } from './solar';
import { createStationariesSystem } from './stationaries';
import type { UnitSystem, UnitSystemPublic } from './systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SendMessage, SpawnFn, UnitSystemMessage } from './types';

export type GameUnitSystems = {
    readonly signals: Pick<ReturnType<typeof createSignalsSystem>, 'getUnitIdsSignal'>;
    readonly unitStates: Readonly<Record<UnitId, UnitState>>;

    readonly energy: EnergySystemController;
    readonly inventory: InventoryController;
    // readonly mother: UnitSystemPublic<MotherData>;
    readonly assembler: AssemblerSystemController;
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
    getSpawnTime(id: UnitId): number;
};

export function createGameSystems(world: GameWorld, deck: BlueprintDeck, logicTick: GameLoop): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: { to: string; message: UnitSystemMessage; notUntil?: number }[] = [];
    const events: UnitEventController[] = [];

    const spawnedEvent = createUnitEvent<UnitState>();
    events.push(spawnedEvent);

    const unitId = sequentialId<UnitId>();
    const unitStates: Record<UnitId, UnitState> = {};
    const unitSpawnTimes: Record<UnitId, number> = {};
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
        unitSpawnTimes[id] = env.currentTick;

        for (const system of Object.values(systems)) {
            system.create(id, config, state);
        }

        spawnedEvent.pub({ unitId: id, payload: state });

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
        delete unitSpawnTimes[unitId];

        for (const ev of events) {
            ev.clear(unitId);
        }
    };

    const updateUnitState = (id: UnitId, patch: Partial<UnitState>) => {
        Object.assign(unitStates[id], patch);
        unitUpdateTimes[id] = env.currentTick;
    };

    const opts: CreateUnitSystemCommonOptions = { env, states: unitStates, sendMessage, updateUnitState, events };

    const energy = createEnergySystem(opts);
    const cpu = createCPUSystem(opts, energy.controller);
    const engine = createEngineSystem(opts, { world, battery: energy.controller });
    const stationaries = createStationariesSystem(opts, { despawn });
    const inventory = createInventorySystem(opts, stationaries.controller, spawn, despawn);
    // const mother = createMotherSystem(opts, { deck, spawn, inventory: inventory.controller });
    const assembler = createAssemblerSystem(opts, spawn, inventory.controller, deck);
    const signals = createSignalsSystem(opts);
    const drill = createDrillSystem(opts, world, inventory.controller, energy.controller);
    const scanner = createScannerSystem(opts, world, inventory.controller, energy.controller);
    const navigator = createNavigatorSystem(opts, world);
    const discovery = createDiscoverySystem(opts, world);
    const solar = createSolarSystem(opts, world, energy.controller);

    for (const system of [
        energy.system,
        cpu,
        engine,
        // mother,
        assembler.system,
        signals,
        stationaries.system,
        inventory.system,
        drill,
        scanner,
        navigator,
        discovery,
        solar,
    ]) {
        systems[system.name] = system;
    }

    logicTick.addGameTask((tick) => {
        // main unit update loop
        // update the env object
        env.currentTick = tick;

        // tick all the components, in order
        solar.tick();
        cpu.tick();
        // mother.tick();
        inventory.system.tick();
        assembler.system.tick();
        stationaries.system.tick();
        discovery.tick();

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

        for (const ev of events) {
            ev.tick();
        }
    });

    return {
        signals,
        unitStates,
        debug: { systems, messageQueue },

        spawn,
        despawn,

        energy: energy.controller,
        inventory: inventory.controller,
        // mother,
        assembler: assembler.controller,
        cpu,
        navigator,
        scanner,

        queryCommands(unitId) {
            if (cpu.has(unitId)) {
                return cpu.queryCommands(unitId);
            }

            return [];
        },

        executeCommand(unitId, call) {
            cpu.handleCommand(unitId, call);
        },

        executeCommandMany(unitIds, call) {
            for (const unitId of unitIds) {
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
        getSpawnTime(id) {
            return unitSpawnTimes[id] ?? -1;
        },
    };
}

export type { CPUData, NavigatorSystemData, ScannerData };
export { UnitModelType } from './signals';
export { type InventoryController, type InventoryData } from './inventory';
export type { AssemblerData } from './assembler';
