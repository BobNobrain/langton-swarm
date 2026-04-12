import { For, onMount, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { GridObjects, GridObjectData } from '../GridObjects/GridObjects';
import { depositModel, materialsByResource, defaultMat } from '../models/deposit';
import { createEventListener } from '@/hooks/events';

export const PlanetResources: Component = () => {
    const { world } = useGame();

    const byResource: Record<string, Record<string, GridObjectData>> = {};

    for (const [nodeId, deposit] of world.resources.entries()) {
        byResource[deposit.resource] ??= {};
        byResource[deposit.resource][nodeId] = { location: nodeId };
    }

    const resourceDeposits = Object.entries(byResource).map(([resource, objects]) => ({
        resource,
        objects,
    }));

    onMount(() =>
        createEventListener(world.resourceUpdate, (tileId, deposit) => {
            if (deposit.amount > 0) {
                return;
            }

            const objects = byResource[deposit.resource];
            delete objects[tileId];
        }),
    );

    return (
        <For each={resourceDeposits}>
            {({ resource, objects }) => {
                return (
                    <GridObjects
                        geom={depositModel}
                        material={materialsByResource[resource] ?? defaultMat}
                        grid={world.surface}
                        hiddenNodes={world.terraIncognita}
                        objects={objects}
                        maxCount={Object.keys(objects).length}
                    />
                );
            }}
        </For>
    );
};
