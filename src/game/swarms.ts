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
    id: string;
    bot: BotState;
    behaviour: BehaviourState;
};

export type SwarmBotId = string;

export type Swarm = {
    readonly id: string;
    readonly blueprintName: string;
    readonly blueprintVersion: number;
    create: (at: NodeId) => SwarmBotId;
    remove: (id: SwarmBotId) => void;
    tick: (tick: number, env: BotEnvironment) => void;

    states: () => SwarmBotData[];
};

function createSwarm(
    swarmId: string,
    {
        blueprintName,
        blueprintVersion,
        behaviour,
        configuration,
    }: {
        blueprintName: string;
        blueprintVersion: number;
        behaviour: BotBehaviour;
        configuration: BotConfiguration;
    },
): Swarm {
    const [getData, setData] = createSignal<Record<SwarmBotId, SwarmBotData>>({});
    const lastUpdateTickNumbers: Record<SwarmBotId, number> = {};
    let idSeq = 0;

    const botsTickRate = getProcessorTickRate(configuration);

    return {
        id: swarmId,
        blueprintName,
        blueprintVersion,
        create: (at) => {
            const id: SwarmBotId = [swarmId, idSeq.toString(16).padStart(4, '0')].join(':');
            ++idSeq;

            const data: SwarmBotData = {
                id,
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
            const patches: Record<
                string,
                {
                    apply: (d: SwarmBotData) => SwarmBotData;
                }[]
            > = {};

            for (const id of idsToTick) {
                const states = data[id];
                patches[id] ??= [];

                behaviour.tick({
                    behaviourState: states.behaviour,
                    botState: states.bot,
                    config: configuration,
                    env,
                    setState: (state, data) => {
                        patches[id].push({
                            apply: ({ behaviour, ...rest }) => ({
                                behaviour: { state, data, instructionPointer: 0 },
                                ...rest,
                            }),
                        });
                    },
                    updateBot: (patch) => {
                        patches[id].push({
                            apply: ({ bot, ...rest }) => {
                                return {
                                    bot: { ...bot, ...patch },
                                    ...rest,
                                };
                            },
                        });
                    },
                    setInstructionPointer: (newValue) => {
                        patches[id].push({
                            apply: ({ behaviour, ...rest }) => ({
                                behaviour: { ...behaviour, instructionPointer: newValue },
                                ...rest,
                            }),
                        });
                    },
                    setData: (name, value) => {
                        patches[id].push({
                            apply: ({ behaviour, ...rest }) => ({
                                behaviour: { ...behaviour, data: { ...behaviour.data, [name]: value } },
                                ...rest,
                            }),
                        });
                    },
                });

                lastUpdateTickNumbers[id] = tick;
            }

            if (Object.values(patches).reduce((acc, next) => acc + next.length, 0) > 0) {
                setData((old) => {
                    const copy = { ...old };
                    for (const [id, patchList] of Object.entries(patches)) {
                        for (const patch of patchList) {
                            copy[id] = patch.apply(copy[id]);
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
            const swarmId = Math.floor(Math.random() * 16_777_216)
                .toString(16)
                .toUpperCase();
            const blueprint = deck.getBlueprint(blueprintName, version);
            const behaviour = deck.getBehaviour(blueprintName, version);
            if (!blueprint || !behaviour) {
                throw new Error('unknown blueprint id: ' + blueprintName);
            }

            const swarm = createSwarm(swarmId, {
                blueprintName,
                blueprintVersion: version,
                behaviour: behaviour,
                configuration: blueprint.config,
            });
            setSwarms((old) => {
                return { ...old, [swarmId]: swarm };
            });

            return swarm;
        },
    };
}
