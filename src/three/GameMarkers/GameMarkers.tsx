import { onMount, type Component } from 'solid-js';
import { MeshBasicMaterial, SphereGeometry } from 'three';
import { useGame } from '@/gameContext';
import { createEventListener } from '@/hooks/events';
import { GridObjects, type GridObjectData } from '../GridObjects/GridObjects';
import { onBeforeRepaint } from '../hooks/handlers';

const markerModel = new SphereGeometry(0.4);
const markerMaterial = new MeshBasicMaterial({ color: '#db4b17', transparent: true, opacity: 0.5 });

export const GameMarkers: Component = () => {
    const { units, world, factions } = useGame();
    const objects: Record<string, GridObjectData> = {};
    const creationTimes: Record<string, number> = {};

    onBeforeRepaint(({ t }) => {
        for (const [objectId, obj] of Object.entries(objects)) {
            obj.positioning = {
                elevation: 0.8 + 0.2 * Math.sin((t - creationTimes[objectId]) / 1_000),
                isDirty: true,
            };
        }
    });

    onMount(() => {
        const map = units.markers.getMap(factions.player.id);
        for (const marker of map.getAll()) {
            const objectId = [marker.location.toString(16), marker.type].join('#');
            objects[objectId] = { location: marker.location };
            creationTimes[objectId] = performance.now();
        }

        createEventListener(units.markers.updated, (map, tiles, type) => {
            for (const affectedTile of tiles) {
                const objectId = [affectedTile.toString(16), type].join('#');
                const marker = map.get(affectedTile, type);

                if (!marker) {
                    delete objects[objectId];
                    delete creationTimes[objectId];
                } else {
                    objects[objectId] = { location: affectedTile };
                    creationTimes[objectId] = performance.now();
                }
            }
        });
    });

    return (
        <GridObjects
            geom={markerModel}
            material={markerMaterial}
            grid={world.surface}
            hiddenNodes={world.terraIncognita}
            objects={objects}
            maxCount={500}
        />
    );
};
