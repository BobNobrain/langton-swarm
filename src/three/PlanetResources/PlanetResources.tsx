import { For, onMount, type Component } from 'solid-js';
import type { KnownResourceName, NodeId } from '@/game';
import { InventoryDelta } from '@/game/inventory';
import { useGame } from '@/gameContext';
import { createEventListener } from '@/hooks/events';
import { GridObjects, GridObjectData } from '../GridObjects/GridObjects';
import { depositModel, materialsByResource, defaultMat } from '../models/deposit';

export const PlanetResources: Component = () => {
    const { world } = useGame();

    const byResource: Record<string, Record<string, GridObjectData>> = {
        combat: {},
        electrical: {},
        energetical: {},
        special: {},
        structural: {},
    } satisfies Record<KnownResourceName, unknown>;

    const totalDepositTilesCount: Record<string, Set<NodeId>> = {
        combat: new Set(),
        electrical: new Set(),
        energetical: new Set(),
        special: new Set(),
        structural: new Set(),
    } satisfies Record<KnownResourceName, Set<NodeId>>;

    for (const { location, deposits } of world.resources.getAll()) {
        for (const deposit of deposits) {
            totalDepositTilesCount[deposit.resource].add(location);
            if (!deposit.isDiscovered) {
                continue;
            }

            byResource[deposit.resource][location] = { location };
        }
    }

    const resourceDeposits = Object.entries(byResource).map(([resource, objects]) => ({
        resource,
        objects,
        maxCount: totalDepositTilesCount[resource].size,
    }));

    onMount(() => {
        createEventListener(world.resources.updated, (tileId) => {
            const deposits = world.resources.findDeposits({ location: tileId });

            // TODO: rework this
            const amounts = InventoryDelta.empty();
            for (const deposit of deposits) {
                if (!deposit.isDiscovered) {
                    continue;
                }

                amounts.alter(deposit.resource, deposit.amount);
            }

            for (const resource of Object.keys(amounts.content)) {
                const objects = byResource[resource];
                const amt = amounts.content[resource];
                if (amt <= 0) {
                    delete objects[tileId];
                } else if (!objects[tileId]) {
                    objects[tileId] = { location: tileId };
                }
            }
        });
    });

    return (
        <For each={resourceDeposits}>
            {({ resource, objects, maxCount }) => {
                return (
                    <GridObjects
                        geom={depositModel}
                        material={materialsByResource[resource as never] ?? defaultMat}
                        grid={world.surface}
                        hiddenNodes={world.terraIncognita}
                        objects={objects}
                        maxCount={maxCount}
                        positioning={{ elevation: 0.1 }}
                    />
                );
            }}
        </For>
    );
};
