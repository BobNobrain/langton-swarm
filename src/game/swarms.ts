import { createMemo, createSignal } from 'solid-js';
import type {
    BehaviourState,
    BotBehaviour,
    BotConfiguration,
    BotDataPatch,
    BotEnvironment,
    BotState,
    NodeId,
} from './types';
import type { BlueprintDeck } from './deck';
import type { Engine } from './engine';
import type { GameWorld } from './world';
import { getProcessorTickRate } from './config';

export type SwarmBotData = {
    bot: BotState;
    behaviour: BehaviourState;
};

export type SwarmBotId = string;

export type Swarm = {
    readonly id: string;
    create: (at: NodeId) => SwarmBotId;
    remove: (id: SwarmBotId) => void;
    tick: (tick: number, env: BotEnvironment) => void;

    states: () => SwarmBotData[];
};

function createSwarm(swarmId: string, behaviour: BotBehaviour, configuration: BotConfiguration): Swarm {
    const [getData, setData] = createSignal<Record<SwarmBotId, SwarmBotData>>({});
    const lastUpdateTickNumbers: Record<SwarmBotId, number> = {};
    let idSeq = 0;

    const botsTickRate = getProcessorTickRate(configuration);

    return {
        id: swarmId,
        create: (at) => {
            const id: SwarmBotId = [swarmId, idSeq].join(':');
            ++idSeq;

            const data: SwarmBotData = {
                behaviour: behaviour.setup(),
                bot: {
                    location: at,
                },
            };

            setData((old) => ({ ...old, [id]: data }));
            lastUpdateTickNumbers[id] = -Infinity;
            return id;
        },

        remove: (id) => {
            delete lastUpdateTickNumbers[id];

            setData((old) => {
                if (!old[id]) {
                    return old;
                }

                const copy = { ...old };
                delete copy[id];
                return copy;
            });
        },

        tick: (tick, env) => {
            const idsToTick = new Set<SwarmBotId>();
            for (const id of Object.keys(lastUpdateTickNumbers)) {
                const ticksSinceUpdate = tick - lastUpdateTickNumbers[id];
                if (ticksSinceUpdate > botsTickRate) {
                    idsToTick.add(id);
                }
            }

            if (!idsToTick.size) {
                return;
            }

            const data = getData();
            const patches: Record<SwarmBotId, BotDataPatch> = {};
            let changed = false;

            for (const id of idsToTick) {
                const states = data[id];
                const patch = behaviour.tick(
                    {
                        behaviourState: states.behaviour,
                        botState: states.bot,
                        config: configuration,
                    },
                    env,
                );

                if (patch) {
                    patches[id] = patch;
                    changed = true;
                }

                lastUpdateTickNumbers[id] = tick;
            }

            if (changed) {
                setData((old) => {
                    const copy = { ...old };
                    for (const [id, patch] of Object.entries(patches)) {
                        copy[id] = { ...copy[id] };
                        if (patch.botState) {
                            copy[id].bot = { ...copy[id].bot, ...patch.botState };
                        }
                        if (patch.behaviourState) {
                            copy[id].behaviour = { ...copy[id].behaviour, ...patch.behaviourState };
                        }
                    }
                    return copy;
                });
            }
        },

        states: createMemo(() => Object.values(getData())),
    };
}

export type GameSwarms = {
    list: () => Swarm[];
    create: (blueprint: string, version: number) => Swarm;
};

export function createGameSwarms(deck: BlueprintDeck, engine: Engine, world: GameWorld): GameSwarms {
    const [getSwarms, setSwarms] = createSignal<Record<string, Swarm>>({});

    engine.on((tick) => {
        const p = world.planet();
        if (!p) {
            return;
        }

        for (const swarm of Object.values(getSwarms())) {
            swarm.tick(tick, { world: p });
        }
    });

    return {
        list: createMemo(() => Object.values(getSwarms())),

        create: (blueprintName, version) => {
            const swarmId = Math.random().toString().substring(2);
            const blueprint = deck.getBlueprint(blueprintName, version);
            const behaviour = deck.getBehaviour(blueprintName, version);
            if (!blueprint || !behaviour) {
                throw new Error('unknown blueprint id: ' + blueprintName);
            }

            const swarm = createSwarm(swarmId, behaviour, blueprint.config);
            setSwarms((old) => {
                return { ...old, [swarmId]: swarm };
            });

            return swarm;
        },
    };
}
