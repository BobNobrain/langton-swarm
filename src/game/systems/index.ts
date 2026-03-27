import { sequentialId } from '@/lib/ids';
import type { BlueprintDeck } from '../deck';
import type { Engine } from '../engine';
import type { NodeId, Planet, UnitCommand, UnitCommandCall, UnitEnvironment, UnitId, UnitState } from '../types';
import type { GameWorld } from '../world';
import { createCPUSystem } from './cpu';
import { createMotherSystem } from './mother';
import { createNavigatorSystem } from './navigator';
import { createSignalsSystem } from './signals';
import type { CreateUnitSystemCommonOptions, UnitSystem, UnitSystemMessage } from './systems';
import type { SpawnOptions } from './utils';

export type GameUnitSystems = {
    readonly signals: Pick<ReturnType<typeof createSignalsSystem>, 'getUnitIdsSignal'>;
    readonly cpu: Pick<ReturnType<typeof createCPUSystem>, 'getData'>;
    readonly unitStates: Readonly<Record<string, UnitState>>;

    providePlanet(planet: Planet): void;
    spawn(options: SpawnOptions): UnitId;
    queryCommands(unitId: UnitId): UnitCommand[];
    executeCommand(unitId: UnitId, call: UnitCommandCall): void;
    executeCommandMany(unitIds: UnitId[], call: UnitCommandCall): void;
    findByLocation(location: NodeId | Set<NodeId>): UnitId[];
    getLastUpdatedTime(id: UnitId): number;
};

export function createGameSystems(world: GameWorld, deck: BlueprintDeck, engine: Engine): GameUnitSystems {
    const systems: Record<string, UnitSystem<unknown>> = {};
    const messageQueue: { to: string; message: UnitSystemMessage }[] = [];

    const unitId = sequentialId<UnitId>();
    const unitStates: Record<UnitId, UnitState> = {};
    const unitUpdateTimes: Record<UnitId, number> = {};
    // const unitConfigs: Record<UnitId, UnitConfiguration> = {};

    const sendMessage: CreateUnitSystemCommonOptions['sendMessage'] = (to, message) => {
        messageQueue.push({ to, message });
    };

    const env: UnitEnvironment = {
        world: world.planet()!,
        currentTick: -1,
    };

    const spawn = ({ at, config }: SpawnOptions): UnitId => {
        const id = unitId.aquire();
        const state: UnitState = { location: at };

        unitStates[id] = state;
        unitUpdateTimes[id] = -1;
        // unitConfigs[id] = config;

        for (const system of Object.values(systems)) {
            system.create(id, config, state);
        }

        return id;
    };

    const updateUnitState = (id: UnitId, patch: Partial<UnitState>) => {
        Object.assign(unitStates[id], patch);
        unitUpdateTimes[id] = env.currentTick;
    };

    const opts: CreateUnitSystemCommonOptions = { env, states: unitStates, sendMessage, updateUnitState };

    const navigator = createNavigatorSystem(opts);
    const cpu = createCPUSystem(opts);
    const mother = createMotherSystem(opts, { deck, spawn });
    const signals = createSignalsSystem(opts);

    systems['navigator'] = navigator;
    systems['cpu'] = cpu;
    systems['mother'] = mother;
    systems['signals'] = signals;

    engine.on((tick) => {
        if (!env.world) {
            return;
        }

        // main unit update loop
        // update the env object
        env.currentTick = tick;

        // tick all the components, in order
        mother.tick();
        cpu.tick();
        navigator.tick();

        // process all the messages to activate the components
        for (const { to, message } of messageQueue) {
            const system = systems[to];
            if (!system) {
                console.error(`[WARN] sendMessage: system "${to}" not found`, message);
                continue;
            }

            system.handleMessage(message);
        }
        messageQueue.length = 0;
    });

    return {
        signals,
        cpu,
        unitStates,

        providePlanet(planet) {
            env.world = planet;
        },

        spawn,

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
    };
}

export { UnitModelType } from './signals';
