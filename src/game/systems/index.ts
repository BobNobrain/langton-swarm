import { sequentialId } from '@/lib/ids';
import type { SavedStatePartition } from '@/lib/SavedState';
import type { UnitConfiguration } from '../config';
import type { GameFactions } from '../factions';
import type { GameLoop } from '../loop';
import type { GameNots } from '../nots';
import type { UnitCommand, UnitCommandCall, UnitId } from '../types';
import type { GameWorld } from '../world';
import { AssemblerSystem, type AssemblerSystemController } from './assembler';
import { CPUSystem, type CPUData, type CPUSystemController } from './cpu';
import { DiscoverySystem } from './discovery';
import { DrillSystem } from './drill';
import { EnergySystem, type EnergySystemController } from './energy';
import { EngineSystem } from './engine';
import { createUnitEvent, type UnitEvent, type UnitEventController } from './events';
import { FactionsSystem, type FactionSystemController } from './faction';
import { InventorySystem, type InventoryController } from './inventory';
import { MarkersSystem, type MarkersSystemController } from './markers';
import { NavigatorSystem, type NavigatorSystemData } from './navigator';
import { PositionalSystem, type PositionalSystemController } from './positions';
import { ScannerSystem, type ScannerData } from './scanner';
import { ConstructionSitesSystem, type ConstructionSitesController } from './sites';
import { SolarSystem } from './solar';
import { StationariesSystem, type StationariesSystemController } from './stationaries';
import type {
    UnitSystemOrchestrator,
    DespawnedEventPayload,
    DespawnFn,
    SendMessage,
    SpawnFn,
    SpawnOptions,
    UnitSystemMessage,
} from './types';
import type { UnitSystem } from './UnitSystem';

export type GameUnitSystems = {
    readonly spawned: UnitEvent<SpawnOptions>;
    readonly despawned: UnitEvent<DespawnedEventPayload>;

    readonly energy: EnergySystemController;
    readonly positions: PositionalSystemController;
    readonly stationaries: StationariesSystemController;
    readonly markers: MarkersSystemController;
    readonly inventory: InventoryController;
    readonly assembler: AssemblerSystemController;
    readonly cpu: CPUSystemController;
    readonly navigator: NavigatorSystem;
    readonly scanner: ScannerSystem;
    readonly factions: FactionSystemController;
    readonly sites: ConstructionSitesController;

    readonly debug: unknown;

    spawn: SpawnFn;
    despawn: DespawnFn;

    all(): UnitId[];
    queryCommands(unitId: UnitId): UnitCommand[];
    executeCommand(unitId: UnitId, call: UnitCommandCall): void;
    executeCommandMany(unitIds: UnitId[], call: UnitCommandCall): void;
    getConfig(id: UnitId): UnitConfiguration | null;
    getSpawnTime(id: UnitId): number;
};

type MessageQueueItem = { to: string; message: UnitSystemMessage; notUntil?: number };

type SaveData = {
    v: 1;
    mq: MessageQueueItem[];
    us: {
        id: UnitId;
        st: number;
        cfg: UnitConfiguration;
    }[];
};

export function createGameSystems(
    world: GameWorld,
    logicTick: GameLoop,
    gameFactions: GameFactions,
    nots: GameNots,
    savedState: SavedStatePartition,
): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: MessageQueueItem[] = [];
    const events: UnitEventController[] = [];

    const spawnedEvent = createUnitEvent<SpawnOptions>();
    events.push(spawnedEvent);
    const despawnedEvent = createUnitEvent<DespawnedEventPayload>();
    events.push(despawnedEvent);

    const unitId = sequentialId<UnitId>();
    const unitSpawnTimes: Record<UnitId, number> = {};
    const unitConfigs: Record<UnitId, UnitConfiguration> = {};

    const save = savedState.value<SaveData>('systems');
    const loaded = save.get();
    if (loaded) {
        messageQueue.push(...loaded.mq);
        for (const unitData of loaded.us) {
            const id = unitData.id;
            unitId.lock(id);
            unitSpawnTimes[id] = unitData.st;
            unitConfigs[id] = unitData.cfg;
        }
    }
    save.onSave(() => {
        const data: SaveData = { v: 1, mq: messageQueue.slice(), us: [] };
        for (const unitIdStr of Object.keys(unitSpawnTimes)) {
            const unitId = Number(unitIdStr) as UnitId;
            data.us.push({ id: unitId, st: unitSpawnTimes[unitId], cfg: unitConfigs[unitId] });
        }
        return data;
    });

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

        const factionId = factions.getFaction(unitId);
        const config = unitConfigs[unitId];

        for (const system of Object.values(systems)) {
            system.remove(unitId);
        }

        delete unitConfigs[unitId];
        delete unitSpawnTimes[unitId];

        for (const ev of events) {
            ev.clear(unitId);
        }

        despawnedEvent.pub({ unitId, payload: { faction: factionId, config } });
    };

    const orc: UnitSystemOrchestrator = {
        sendMessage,
        events,
        systems,
        logicTick,
        savedState: savedState.partition('data'),
        spawn,
        despawn,
    };

    const energy = new EnergySystem(orc);
    const positions = new PositionalSystem(orc, logicTick);
    const factions = new FactionsSystem(orc, gameFactions);
    const markers = new MarkersSystem(orc, positions, world.nav, factions);
    const cpu = new CPUSystem(orc, energy, nots);
    const engine = new EngineSystem(orc, { world, battery: energy, positions: positions });
    const stationaries = new StationariesSystem(orc);
    const inventory = new InventorySystem(orc, stationaries, positions);
    const sites = new ConstructionSitesSystem(orc, inventory, positions, factions);
    const assembler = new AssemblerSystem(orc, positions, inventory, factions, sites);
    const drill = new DrillSystem(orc, world, positions, inventory, energy);
    const scanner = new ScannerSystem(orc, world, positions, inventory, energy, markers);
    const navigator = new NavigatorSystem(orc, { world, positions: positions });
    const discovery = new DiscoverySystem(orc, world, positions, gameFactions);
    const solar = new SolarSystem(orc, world, positions, energy);

    logicTick.addGameTask((tick) => {
        // main unit update loop

        // tick all the components, in order
        solar.tick();
        cpu.tick();
        inventory.tick();
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
        debug: { systems, messageQueue },
        spawned: spawnedEvent,
        despawned: despawnedEvent,

        spawn,
        despawn,

        energy: energy,
        positions: positions,
        stationaries: stationaries,
        factions: factions,
        markers: markers,
        inventory: inventory,
        assembler: assembler,
        cpu: cpu,
        navigator,
        scanner,
        sites: sites,

        queryCommands(unitId) {
            return cpu.queryCommands(unitId);
        },

        executeCommand(unitId, call) {
            cpu.executeCommand(unitId, call);
        },

        executeCommandMany(unitIds, call) {
            for (const unitId of unitIds) {
                cpu.executeCommand(unitId, call);
            }
        },

        getConfig(id) {
            return unitConfigs[id] ?? null;
        },
        getSpawnTime(id) {
            return unitSpawnTimes[id] ?? -1;
        },

        all() {
            return Object.keys(unitSpawnTimes).map(Number) as UnitId[];
        },
    };
}

export type { CPUData, NavigatorSystemData, ScannerData, DespawnedEventPayload };
export { type InventoryController, type InventoryData } from './inventory';
export type { AssemblerData } from './assembler';
export type { DynamicPosition as DynamicLocation, PositionalSystemController } from './positions';
export type { MarkersSystemController } from './markers';
export type { MarkerData, MarkersMap } from './MarkersMap';
