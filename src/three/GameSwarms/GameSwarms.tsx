import { For, type Component } from 'solid-js';
import { type FactionId, type UnitConfiguration, type UnitId } from '@/game';
import { isConstructionSite, isPile } from '@/game/config';
import { useGame } from '@/gameContext';
import { createUnitEventAllListener } from '@/hooks/events';
import { GridObjects, type GridObjectData, type GridObjectPositioning } from '../GridObjects/GridObjects';
import { onBeforeRepaint } from '../hooks/handlers';
import { getUnitModel, getUnitModelFactionless, UnitModel, UnitModelType } from '../models/units';
import { SelectionSwarm } from './SelectionSwarm';
import { syncPositions } from './sync';

const UNIT_POSITIONING: GridObjectPositioning = { rotation: 'auto' };
const PILE_BOUNCE_PERIOD = 400;

const FACTIONLESS_MODELS = [UnitModelType.Pile, UnitModelType.Unknown] as const;
const FACTION_MODELS = [
    UnitModelType.Mother,
    UnitModelType.Rover,
    UnitModelType.MiningTower,
    UnitModelType.ConstructionSite,
] as const;

type SwarmData = {
    model: UnitModelType;
    objects: Record<string, GridObjectData>;
};

const Swarm: Component<{ model: UnitModel; objects: Record<string, GridObjectData>; animation?: 'pile' | 'none' }> = (
    props,
) => {
    const { units, world } = useGame();
    const objects = props.objects; // not reactive anyway

    if (props.animation === 'pile') {
        onBeforeRepaint(({ t }) => {
            for (const objectId of Object.keys(objects)) {
                const obj = objects[objectId];
                const spawnTime = units.getSpawnTime(Number(objectId) as UnitId) ?? 0;
                obj.positioning = {
                    isDirty: true,
                    elevation: (1 + Math.sin((t - spawnTime) / PILE_BOUNCE_PERIOD)) * 0.1,
                };
            }
        });
    }

    return (
        <GridObjects
            geom={props.model.geom}
            material={props.model.mat}
            grid={world.surface}
            objects={objects}
            // TODO: increase maxCount dynamically, like a dynamic array does
            maxCount={200}
            positioning={UNIT_POSITIONING}
        />
    );
};

export const GameSwarms: Component = () => {
    const { units, factions, gameTick } = useGame();
    const allStates = new Map<FactionId, SwarmData[]>();
    const factionlessStates: Record<(typeof FACTIONLESS_MODELS)[number], Record<string, GridObjectData>> = {
        [UnitModelType.Pile]: {},
        [UnitModelType.Unknown]: {},
    };

    gameTick.addGameTask((tick) => {
        for (const model of FACTIONLESS_MODELS) {
            syncPositions(units.positions, factionlessStates[model], tick);
        }

        for (const swarms of allStates.values()) {
            for (const swarm of swarms) {
                syncPositions(units.positions, swarm.objects, tick);
            }
        }
    });

    createUnitEventAllListener({
        ev: units.spawned,
        listener({ unitId, payload: { at, faction, config } }) {
            const model = getUnitModelType(config);
            const swarms = allStates.get(faction)!;

            for (const swarm of swarms) {
                if (swarm.model === model) {
                    swarm.objects[unitId] = { location: at };
                    break;
                }
            }
        },
    });
    createUnitEventAllListener({
        ev: units.despawned,
        listener({ unitId, payload: { faction, config } }) {
            const model = getUnitModelType(config);
            const swarms = allStates.get(faction)!;

            for (const swarm of swarms) {
                if (swarm.model === model) {
                    delete swarm.objects[unitId];
                    break;
                }
            }
        },
    });

    return (
        <>
            <For each={FACTIONLESS_MODELS}>
                {(modelType) => {
                    return (
                        <Swarm
                            model={getUnitModelFactionless(modelType)}
                            objects={factionlessStates[modelType]}
                            animation={modelType === UnitModelType.Pile ? 'pile' : undefined}
                        />
                    );
                }}
            </For>
            <For each={factions.rFactions()}>
                {(faction) => {
                    const states = allStates.getOrInsertComputed(faction.id, () =>
                        FACTION_MODELS.map((umt): SwarmData => ({ model: umt, objects: {} })),
                    );

                    return (
                        <For each={states}>
                            {(state) => {
                                return <Swarm model={getUnitModel(state.model, faction)} objects={state.objects} />;
                            }}
                        </For>
                    );
                }}
            </For>
            <SelectionSwarm />
        </>
    );
};

function getUnitModelType(config: UnitConfiguration): UnitModelType {
    if (config.assembler && !config.engine && config.storage) {
        return UnitModelType.Mother;
    }

    if (config.engine) {
        return UnitModelType.Rover;
    }

    if (isPile(config)) {
        return UnitModelType.Pile;
    }

    if (isConstructionSite(config)) {
        return UnitModelType.ConstructionSite;
    }

    if (!config.engine && config.drill) {
        return UnitModelType.MiningTower;
    }

    return UnitModelType.Unknown;
}
