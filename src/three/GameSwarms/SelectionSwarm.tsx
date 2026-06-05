import { createEffect, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { GridObjects, type GridObjectData } from '../GridObjects/GridObjects';
import { selection } from '../models/units';
import { extractUnitPosition, syncPositions } from './sync';

export const SelectionSwarm: Component = () => {
    const { ui, units, world, gameTick } = useGame();
    const objects: Record<string, GridObjectData> = {};

    createEffect(() => {
        const selectedUnitIds = ui.rSelectedUnits();
        const idsToDelete = new Set(Object.keys(objects));
        const tick = gameTick.getCurrentTick();

        for (const unitId of selectedUnitIds) {
            const objectId = String(unitId);
            idsToDelete.delete(objectId);

            if (!objects[objectId]) {
                const pos = units.positions.getFullPosition(unitId);

                if (pos) {
                    objects[objectId] = { location: extractUnitPosition(pos, tick) };
                }
            }
        }

        for (const objectId of idsToDelete) {
            delete objects[objectId];
        }
    });

    gameTick.addGameTask((tick) => syncPositions(units.positions, objects, tick));

    return (
        <GridObjects
            geom={selection.geom}
            material={selection.mat}
            grid={world.surface}
            objects={objects}
            // TODO: increase maxCount dynamically, like a dynamic array does
            maxCount={200}
        />
    );
};
