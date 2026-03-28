import type { NodeId } from '@/game';
import { useGame } from '@/gameContext';
import { createMemo, For, type Component } from 'solid-js';
import { GridObjects, GridObjectData } from '../GridObjects/GridObjects';
import { depositModel, materialsByResource, defaultMat } from '../models/deposit';

export const PlanetResources: Component = () => {
    const { world } = useGame();

    const resourceDeposits = createMemo(() => {
        const planet = world.planet();
        if (!planet) {
            return [];
        }

        // TODO: data updates
        const byResource: Record<string, Record<string, GridObjectData>> = {};

        for (const [nodeId, deposit] of planet.resources.entries()) {
            byResource[deposit.resource] ??= {};
            byResource[deposit.resource][nodeId] = { location: nodeId };
        }

        return Object.entries(byResource).map(([resource, objects]) => ({
            resource,
            objects,
        }));
    });

    return (
        <For each={resourceDeposits()}>
            {({ resource, objects }) => {
                return (
                    <GridObjects
                        geom={depositModel}
                        material={materialsByResource[resource] ?? defaultMat}
                        grid={world.planet()?.nodes ?? []}
                        objects={objects}
                        isStatic // to be removed when resources will be mineable
                        maxCount={Object.keys(objects).length}
                    />
                );
            }}
        </For>
    );
};
