import { For, type Component } from 'solid-js';
import { SurfaceNode, UnitModelType, type UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { GridObjects, type GridObjectData } from '../GridObjects/GridObjects';
import { onBeforeRepaint } from '../hooks/handlers';
import { getUnitModel, selection, UnitModel } from '../models/units';

const Swarm: Component<{ grid: SurfaceNode[]; unitIds: UnitId[]; model: UnitModel }> = (props) => {
    const { units } = useGame();
    const objects: Record<string, GridObjectData> = {};

    onBeforeRepaint(() => {
        const idsToDelete = new Set(Object.keys(objects));

        for (const unitId of props.unitIds) {
            const state = units.unitStates[unitId];
            if (!state) {
                continue;
            }

            idsToDelete.delete(unitId.toString());
            if (!objects[unitId]) {
                objects[unitId] = { location: state.location };
            } else {
                objects[unitId].location = state.location;
            }
        }

        for (const id of idsToDelete) {
            delete objects[id];
        }
    });

    return (
        <GridObjects
            geom={props.model.geom}
            material={props.model.mat}
            grid={props.grid}
            objects={objects}
            maxCount={200}
        />
    );
};

const ALL_MODELS = [UnitModelType.Mother, UnitModelType.Rover, UnitModelType.Pile, UnitModelType.Unknown];

export const GameSwarms: Component = () => {
    const { world, units, ui } = useGame();

    return (
        <>
            <For each={ALL_MODELS}>
                {(modelType) => {
                    return (
                        <Swarm
                            grid={world.surface}
                            model={getUnitModel(modelType)}
                            unitIds={units.signals.getUnitIdsSignal(modelType)()}
                        />
                    );
                }}
            </For>
            <Swarm grid={world.surface} model={selection} unitIds={ui.rSelectedUnits()} />
        </>
    );
};
