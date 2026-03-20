import { createSignal } from 'solid-js';
import { getProcessorTickRate } from './config';
import type { BlueprintDeck, BlueprintId } from './deck';
import type { Engine } from './engine';
import { compileBotProgram } from './program';
import type {
    BehaviourState,
    UnitEnvironment,
    UnitState,
    NodeId,
    UnitConfiguration,
    UnitCommand,
    UnitCommandCall,
    BehaviourTickContext,
} from './types';
import type { GameWorld } from './world';

export type SwarmUnitData = {
    id: SwarmUnitId;
    unit: UnitState;
    behaviour: BehaviourState;
    lastTickId: number;
};

export type SwarmUnitId = string;
export type SwarmId = string;

// TODO: unexport this
export type SwarmData = {
    id: SwarmId;
    blueprintId: BlueprintId;
    blueprintVersion: number;
    botStates: Record<SwarmUnitId, SwarmUnitData>;
    rUnitIds: () => SwarmUnitId[];
    findUnitsByLocation: (location: NodeId, into: Set<SwarmUnitId>) => void;
    getUnitCommands: (id: SwarmUnitId, env: UnitEnvironment) => UnitCommand[];
    execUnitCommand: (id: SwarmUnitId, command: UnitCommandCall, env: UnitEnvironment) => void;
};

type SwarmController = SwarmData & {
    create: (at: NodeId) => SwarmUnitId;
    remove: (id: SwarmUnitId) => void;
    tick: (tick: number, env: UnitEnvironment) => void;
};

export type GameSwarms = {
    rSwarmIds: () => SwarmId[];
    getSwarmData: (id: SwarmId) => SwarmData | null;
    getSwarmDataByUnitId: (id: SwarmUnitId) => SwarmData | null;
    findSwarms: (blueprintId: BlueprintId, blueprintVersion?: number) => SwarmId[];

    spawn: (opts: { blueprint: BlueprintId; version: number; position: NodeId }) => SwarmUnitId;
    getUnitData: (id: SwarmUnitId) => Readonly<SwarmUnitData> | null;
    despawn: (id: SwarmUnitId) => void;

    findUnitsByLocation: (location: NodeId) => Set<SwarmUnitId>;
    getUnitCommands: (id: SwarmUnitId) => UnitCommand[];
    execUnitCommand: (ids: SwarmUnitId[], command: UnitCommandCall) => void;
};

export function createGameSwarms(deck: BlueprintDeck, engine: Engine, world: GameWorld): GameSwarms {
    const swarmsById: Record<SwarmId, SwarmController> = {};
    const idsByBlueprint: Record<BlueprintId, Map<number, SwarmId>> = {};
    const [rSwarmIds, rSetSwarmIds] = createSignal<SwarmId[]>([]);

    const getEnv = (): UnitEnvironment | null => {
        const planet = world.planet();
        if (!planet) {
            return null;
        }

        return { world: planet };
    };

    engine.on((tick) => {
        const env = getEnv();
        if (!env) {
            return;
        }

        for (const swarm of Object.values(swarmsById)) {
            swarm.tick(tick, env);
        }
    });

    const getOrCreateByBlueprint = (blueprintId: BlueprintId, blueprintVersion: number): SwarmController => {
        const byVersions = idsByBlueprint[blueprintId];
        if (byVersions) {
            const id = byVersions.get(blueprintVersion);
            if (id) {
                return swarmsById[id];
            }
        }

        const blueprint = deck.getBlueprint(blueprintId);
        const config = deck.getConfiguration(blueprintId, blueprintVersion);
        if (!config || !blueprint) {
            throw new Error('unknown blueprint: #' + blueprintId + ' v' + blueprintVersion);
        }

        blueprint.lockVersion(blueprintVersion);

        const newSwarm = createSwarm(blueprintId, blueprintVersion, config);
        swarmsById[newSwarm.id] = newSwarm;

        idsByBlueprint[blueprintId] ??= new Map();
        idsByBlueprint[blueprintId].set(blueprintVersion, newSwarm.id);

        rSetSwarmIds(Object.keys(swarmsById)); // reactive update must happen after all other data has been filled
        return newSwarm;
    };

    return {
        rSwarmIds,
        getSwarmData: (id) => swarmsById[id] ?? null,
        getSwarmDataByUnitId: (id) => swarmsById[extractSwarmId(id)] ?? null,

        findSwarms(blueprintId, blueprintVersion) {
            const versionsMap = idsByBlueprint[blueprintId];
            if (!versionsMap) {
                return [];
            }

            if (blueprintVersion === undefined) {
                return Array.from(versionsMap.values());
            }

            const versionId = versionsMap.get(blueprintVersion);
            return versionId === undefined ? [] : [versionId];
        },

        spawn(opts) {
            const swarm = getOrCreateByBlueprint(opts.blueprint, opts.version);
            return swarm.create(opts.position);
        },
        despawn(id) {
            const swarmId = extractSwarmId(id);
            const swarm = swarmsById[swarmId];
            if (!swarm) {
                return;
            }

            swarm.remove(id);
        },
        getUnitData(id) {
            const swarmId = extractSwarmId(id);
            const swarm = swarmsById[swarmId];
            return swarm.botStates[id];
        },

        findUnitsByLocation(location) {
            const result = new Set<SwarmUnitId>();
            for (const swarm of Object.values(swarmsById)) {
                swarm.findUnitsByLocation(location, result);
            }
            return result;
        },

        getUnitCommands(id) {
            const swarmId = extractSwarmId(id);
            const swarm = swarmsById[swarmId];
            const env = getEnv();
            if (!swarm || !env) {
                return [];
            }

            return swarm.getUnitCommands(id, env);
        },

        execUnitCommand(ids, command) {
            const env = getEnv();
            if (!env) {
                return;
            }

            for (const id of ids) {
                const swarmId = extractSwarmId(id);
                const swarm = swarmsById[swarmId];
                if (!swarm) {
                    continue;
                }

                swarm.execUnitCommand(id, command, env);
            }
        },
    };
}

function createSwarm(bpId: BlueprintId, bpVersion: number, config: UnitConfiguration): SwarmController {
    const id = makeSwarmId();
    let unitIdSeq = 0;

    const unitData: Record<SwarmUnitId, SwarmUnitData> = {};
    const [rUnitIds, rSetUnitIds] = createSignal<SwarmUnitId[]>([]);
    const rUpdateUnitIds = () => rSetUnitIds(Object.keys(unitData));

    const botsTickRate = getProcessorTickRate(config);

    // TODO: account for blueprints where program is not necessary
    const compiled = compileBotProgram(config);
    if (!compiled.ok) {
        throw new Error('cannot create swarm: failed to compile the program: ' + compiled.message);
    }

    const behaviour = compiled.result;
    const makeContext = (data: SwarmUnitData, env: UnitEnvironment): BehaviourTickContext => ({
        behaviourState: data.behaviour,
        unitState: data.unit,
        env,
        setData(name, value) {
            data.behaviour.data[name] = value;
        },
        setInstructionPointer(newValue) {
            data.behaviour.instructionPointer = newValue;
        },
        setState(newState) {
            data.behaviour = newState;
        },
        updateUnit(patch) {
            Object.assign(data.unit, patch);
        },
    });

    return {
        id,
        blueprintId: bpId,
        blueprintVersion: bpVersion,
        botStates: unitData,
        rUnitIds,

        create(at) {
            const botN = unitIdSeq;
            ++unitIdSeq;
            const newUnitData: SwarmUnitData = {
                id: makeUnitId(id, botN),
                unit: { location: at },
                behaviour: behaviour.setup(),
                lastTickId: 0,
            };
            unitData[newUnitData.id] = newUnitData;
            rUpdateUnitIds();
            return newUnitData.id;
        },

        remove(id) {
            if (!(id in unitData)) {
                return;
            }

            delete unitData[id];
            rUpdateUnitIds();
        },

        tick(tick, env) {
            for (const data of Object.values(unitData)) {
                const ticksSinceUpdate = tick - data.lastTickId;
                if (ticksSinceUpdate < botsTickRate) {
                    continue;
                }

                data.lastTickId = tick;
                behaviour.tick(makeContext(data, env));
            }
        },

        findUnitsByLocation(location, into) {
            // TODO: add a hash
            for (const botState of Object.values(unitData)) {
                if (botState.unit.location === location) {
                    into.add(botState.id);
                }
            }
        },

        getUnitCommands(id, env) {
            const unit = unitData[id];
            if (!unit) {
                return [];
            }

            return behaviour.getCommands({ behaviourState: unit.behaviour, unitState: unit.unit, env });
        },

        execUnitCommand(id, command, env) {
            behaviour.executeCommand(command.name, command.args, makeContext(unitData[id], env));
        },
    };
}

function extractSwarmId(botId: SwarmUnitId): SwarmId {
    return botId.substring(0, 6);
}
function makeUnitId(swarmId: SwarmId, n: number): SwarmUnitId {
    return [swarmId, n.toString(16).padStart(4, '0')].join(':');
}
function makeSwarmId(): SwarmId {
    return Math.floor(Math.random() * 16_777_216)
        .toString(16)
        .padStart(6, '0')
        .toUpperCase();
}
