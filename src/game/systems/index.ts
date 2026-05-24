import { sequentialId } from '@/lib/ids';
import type { UnitConfiguration } from '../config';
import type { GameFactions } from '../factions';
import type { GameLoop } from '../loop';
import type { GameNots } from '../nots';
import type { UnitCommand, UnitCommandCall, UnitId } from '../types';
import type { GameWorld } from '../world';
import { createAssemblerSystem, type AssemblerSystemController } from './assembler';
import { createCPUSystem, type CPUData, type CPUSystemController } from './cpu';
import { createDiscoverySystem } from './discovery';
import { createDrillSystem } from './drill';
import { createEnergySystem, type EnergySystemController } from './energy';
import { createEngineSystem } from './engine';
import { createUnitEvent, type UnitEvent, type UnitEventController } from './events';
import { createInventorySystem, type InventoryController } from './inventory';
import { createNavigatorSystem, type NavigatorSystemData } from './navigator';
import { createPositionalSystem, type PositionalSystemController } from './positions';
import { createScannerSystem, type ScannerData } from './scanner';
import { createSignalsSystem } from './signals';
import { createSolarSystem } from './solar';
import { createStationariesSystem, type StationariesSystemController } from './stationaries';
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
import { createMarkers, type MarkersSystemController } from './markers';
import { createFactionsSystem, type FactionSystemController } from './faction';
import { createConstructionSitesSystem, type ConstructionSitesController } from './sites';

export type GameUnitSystems = {
    readonly signals: Pick<ReturnType<typeof createSignalsSystem>, 'getUnitIdsSignal'>;

    readonly spawned: UnitEvent<SpawnOptions>;
    readonly despawned: UnitEvent<unknown>;

    readonly energy: EnergySystemController;
    readonly positions: PositionalSystemController;
    readonly stationaries: StationariesSystemController;
    readonly markers: MarkersSystemController;
    readonly inventory: InventoryController;
    readonly assembler: AssemblerSystemController;
    readonly cpu: CPUSystemController;
    readonly navigator: UnitSystemPublic<NavigatorSystemData>;
    readonly scanner: UnitSystemPublic<ScannerData>;
    readonly factions: FactionSystemController;
    readonly sites: ConstructionSitesController;

    readonly debug: unknown;

    spawn: SpawnFn;
    despawn: DespawnFn;

    queryCommands(unitId: UnitId): UnitCommand[];
    executeCommand(unitId: UnitId, call: UnitCommandCall): void;
    executeCommandMany(unitIds: UnitId[], call: UnitCommandCall): void;
    getConfig(id: UnitId): UnitConfiguration | null;
    getSpawnTime(id: UnitId): number;
};

export function createGameSystems(
    world: GameWorld,
    logicTick: GameLoop,
    gameFactions: GameFactions,
    nots: GameNots,
): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: { to: string; message: UnitSystemMessage; notUntil?: number }[] = [];
    const events: UnitEventController[] = [];

    const spawnedEvent = createUnitEvent<SpawnOptions>();
    events.push(spawnedEvent);
    const despawnedEvent = createUnitEvent<null>();
    events.push(despawnedEvent);

    const unitId = sequentialId<UnitId>();
    const unitSpawnTimes: Record<UnitId, number> = {};
    const unitConfigs: Record<UnitId, UnitConfiguration> = {};

    const sendMessage: SendMessage = (to, message, delay) => {
        messageQueue.push({ to, message, notUntil: delay ? logicTick.getCurrentTick() + delay : undefined });
    };

    const spawn: SpawnFn = (opts) => {
        const { at, config } = opts;
        console.log('[DEBUG] spawn:', at.toString(16), config);
        const id = unitId.aquire();

        unitConfigs[id] = config;
        unitSpawnTimes[id] = logicTick.getCurrentTick();

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

        delete unitConfigs[unitId];
        delete unitSpawnTimes[unitId];

        for (const ev of events) {
            ev.clear(unitId);
        }

        despawnedEvent.pub({ unitId, payload: null });
    };

    const opts: CreateUnitSystemCommonOptions = {
        sendMessage,
        events,
        systems,
        logicTick,
    };

    const energy = createEnergySystem(opts);
    const positions = createPositionalSystem(opts, logicTick);
    const factions = createFactionsSystem(opts, gameFactions);
    const markers = createMarkers(opts, positions.controller, world.nav);
    const cpu = createCPUSystem(opts, energy.controller, nots);
    const engine = createEngineSystem(opts, { world, battery: energy.controller, positions: positions.controller });
    const stationaries = createStationariesSystem(opts, { despawn });
    const inventory = createInventorySystem(opts, stationaries.controller, positions.controller, spawn, despawn);
    const sites = createConstructionSitesSystem(
        opts,
        inventory.controller,
        positions.controller,
        factions.controller,
        spawn,
        despawn,
    );
    const assembler = createAssemblerSystem(
        opts,
        spawn,
        positions.controller,
        inventory.controller,
        factions.controller,
        sites.controller,
    );
    const signals = createSignalsSystem(opts);
    const drill = createDrillSystem(opts, world, positions.controller, inventory.controller, energy.controller);
    const scanner = createScannerSystem(
        opts,
        world,
        positions.controller,
        inventory.controller,
        energy.controller,
        markers.controller,
    );
    const navigator = createNavigatorSystem(opts, { world, positions: positions.controller });
    const discovery = createDiscoverySystem(opts, world, positions.controller);
    const solar = createSolarSystem(opts, world, positions.controller, energy.controller);

    logicTick.addGameTask((tick) => {
        // main unit update loop

        // tick all the components, in order
        solar.tick();
        cpu.system.tick();
        inventory.system.tick();
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
        spawned: spawnedEvent,
        despawned: despawnedEvent,

        spawn,
        despawn,

        energy: energy.controller,
        positions: positions.controller,
        stationaries: stationaries.controller,
        factions: factions.controller,
        markers: markers.controller,
        inventory: inventory.controller,
        assembler: assembler.controller,
        cpu: cpu.controller,
        navigator,
        scanner,
        sites: sites.controller,

        queryCommands(unitId) {
            if (cpu.system.has(unitId)) {
                return cpu.system.queryCommands(unitId);
            }

            return [];
        },

        executeCommand(unitId, call) {
            cpu.system.handleCommand(unitId, call);
        },

        executeCommandMany(unitIds, call) {
            for (const unitId of unitIds) {
                cpu.system.handleCommand(unitId, call);
            }
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
export type { MarkersSystemController } from './markers';
export type { MarkerData, MarkersMap } from './MarkersMap';
