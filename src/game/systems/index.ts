import { sequentialId } from '@/lib/ids';
import type { UnitConfiguration } from '../config';
import type { BlueprintDeck } from '../deck';
import type { GameLoop } from '../loop';
import type { UnitCommand, UnitCommandCall, UnitEnvironment, UnitId } from '../types';
import type { GameWorld } from '../world';
import { createAssemblerSystem, type AssemblerSystemController } from './assembler';
import { createCPUSystem, type CPUData } from './cpu';
import { createDiscoverySystem } from './discovery';
import { createDrillSystem } from './drill';
import { createEnergySystem, type EnergySystemController } from './energy';
import { createEngineSystem } from './engine';
import { createUnitEvent, type UnitEventController } from './events';
import { createInventorySystem, type InventoryController } from './inventory';
import { createNavigatorSystem, type NavigatorSystemData } from './navigator';
import { createPositionalSystem, type PositionalSystemController } from './positions';
import { createScannerSystem, type ScannerData } from './scanner';
import { createSignalsSystem } from './signals';
import { createSolarSystem } from './solar';
import { createStationariesSystem } from './stationaries';
import type {
    CreateUnitSystemCommonOptions,
    DespawnFn,
    SendMessage,
    SpawnFn,
    SpawnOptions,
    UnitSystem,
    UnitSystemMessage,
    UnitSystemPublic,
} from './types';

export type GameUnitSystems = {
    readonly signals: Pick<ReturnType<typeof createSignalsSystem>, 'getUnitIdsSignal'>;

    readonly energy: EnergySystemController;
    readonly positions: PositionalSystemController;
    readonly inventory: InventoryController;
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
    getLastUpdatedTime(id: UnitId): number;
    getConfig(id: UnitId): UnitConfiguration | null;
    getSpawnTime(id: UnitId): number;
};

export function createGameSystems(world: GameWorld, deck: BlueprintDeck, logicTick: GameLoop): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: { to: string; message: UnitSystemMessage; notUntil?: number }[] = [];
    const events: UnitEventController[] = [];

    const spawnedEvent = createUnitEvent<SpawnOptions>();
    events.push(spawnedEvent);

    const unitId = sequentialId<UnitId>();
    const unitSpawnTimes: Record<UnitId, number> = {};
    const unitUpdateTimes: Record<UnitId, number> = {};
    const unitConfigs: Record<UnitId, UnitConfiguration> = {};

    const env: UnitEnvironment = {
        currentTick: -1,
    };

    const sendMessage: SendMessage = (to, message, delay) => {
        messageQueue.push({ to, message, notUntil: delay ? env.currentTick + delay : undefined });
    };

    const spawn: SpawnFn = (opts) => {
        const { at, config } = opts;
        console.log('[DEBUG] spawn:', at.toString(16), config);
        const id = unitId.aquire();

        unitUpdateTimes[id] = -1;
        unitConfigs[id] = config;
        unitSpawnTimes[id] = env.currentTick;

        for (const system of Object.values(systems)) {
            system.create(id, opts);
        }

        spawnedEvent.pub({ unitId: id, payload: opts });

        return id;
    };
    const despawn: DespawnFn = (unitId) => {
        console.log('[DEBUG] despawn:', unitId);

        for (const system of Object.values(systems)) {
            system.remove(unitId);
        }

        delete unitUpdateTimes[unitId];
        delete unitConfigs[unitId];
        delete unitSpawnTimes[unitId];

        for (const ev of events) {
            ev.clear(unitId);
        }
    };

    const opts: CreateUnitSystemCommonOptions = {
        env,
        sendMessage,
        events,
        systems,
    };

    const energy = createEnergySystem(opts);
    const positions = createPositionalSystem(opts);
    const cpu = createCPUSystem(opts, energy.controller);
    const engine = createEngineSystem(opts, { world, battery: energy.controller, positions: positions.controller });
    const stationaries = createStationariesSystem(opts, { despawn });
    const inventory = createInventorySystem(opts, stationaries.controller, positions.controller, spawn, despawn);
    const assembler = createAssemblerSystem(opts, spawn, positions.controller, inventory.controller, deck);
    const signals = createSignalsSystem(opts);
    const drill = createDrillSystem(opts, world, positions.controller, inventory.controller, energy.controller);
    const scanner = createScannerSystem(opts, world, positions.controller, inventory.controller, energy.controller);
    const navigator = createNavigatorSystem(opts, { world, positions: positions.controller });
    const discovery = createDiscoverySystem(opts, world, positions.controller);
    const solar = createSolarSystem(opts, world, positions.controller, energy.controller);

    logicTick.addGameTask((tick) => {
        // main unit update loop
        // update the env object
        env.currentTick = tick;

        // tick all the components, in order
        solar.tick();
        cpu.tick();
        inventory.system.tick();
        assembler.system.tick();
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
        debug: { systems, messageQueue },

        spawn,
        despawn,

        energy: energy.controller,
        positions: positions.controller,
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
export type { DynamicPosition as DynamicLocation, PositionalSystemController } from './positions';
