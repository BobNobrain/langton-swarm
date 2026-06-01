import { For, type Component } from 'solid-js';
import { SurfaceNode, UnitModelType, type UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { GridObjects, type GridObjectData, type GridObjectPositioning } from '../GridObjects/GridObjects';
import { onBeforeRepaint } from '../hooks/handlers';
import { getUnitModel, getUnitModelFactionless, selection, UnitModel } from '../models/units';

const UNIT_POSITIONING: GridObjectPositioning = { rotation: 'auto' };
const PILE_BOUNCE_PERIOD = 400;

const Swarm: Component<{ grid: SurfaceNode[]; unitIds: UnitId[]; model: UnitModel; animation?: 'pile' | 'none' }> = (
    props,
) => {
    const { units, gameTick } = useGame();
    const objects: Record<string, GridObjectData> = {};

    gameTick.addGameTask((tick) => {
        const idsToDelete = new Set(Object.keys(objects));

        for (const unitId of props.unitIds) {
            const state = units.positions.getFullPosition(unitId);
            if (!state) {
                continue;
            }

            idsToDelete.delete(unitId.toString());
            const location: Exclude<GridObjectData['location'], number> = {
                from: state.sourcePosition,
                to: state.targetPosition,
                progress:
                    state.targetTime === state.sourceTime
                        ? 1
                        : Math.min(1, (tick - state.sourceTime) / (state.targetTime - state.sourceTime)),
            };

            if (!objects[unitId]) {
                objects[unitId] = { location };
            } else {
                objects[unitId].location = location;
            }
        }

        for (const id of idsToDelete) {
            delete objects[id];
        }
    });

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
            grid={props.grid}
            objects={objects}
            maxCount={200}
            positioning={UNIT_POSITIONING}
        />
    );
};

const FACTIONLESS_MODELS = [UnitModelType.Pile, UnitModelType.ConstructionSite, UnitModelType.Unknown];
const FACTION_MODELS = [UnitModelType.Mother, UnitModelType.Rover, UnitModelType.MiningTower];

export const GameSwarms: Component = () => {
    const { world, units, ui, factions } = useGame();

    return (
        <>
            <For each={FACTIONLESS_MODELS}>
                {(modelType) => {
                    return (
                        <Swarm
                            grid={world.surface}
                            model={getUnitModelFactionless(modelType)}
                            unitIds={units.signals.getUnitIdsSignal(modelType)()}
                            animation={modelType === UnitModelType.Pile ? 'pile' : undefined}
                        />
                    );
                }}
            </For>
            <For each={factions.rFactions()}>
                {(faction) => {
                    return (
                        <For each={FACTION_MODELS}>
                            {(modelType) => {
                                return (
                                    <Swarm
                                        grid={world.surface}
                                        model={getUnitModel(modelType, faction)}
                                        // TODO: incorporate faction!
                                        unitIds={units.signals.getUnitIdsSignal(modelType)()}
                                        animation={modelType === UnitModelType.Pile ? 'pile' : undefined}
                                    />
                                );
                            }}
                        </For>
                    );
                }}
            </For>
            <Swarm grid={world.surface} model={selection} unitIds={ui.rSelectedUnits()} />
        </>
    );
};
