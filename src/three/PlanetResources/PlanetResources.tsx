import type { NodeId } from '@/game';
import { useGame } from '@/gameContext';
import { createMemo, For, type Component } from 'solid-js';
import { GridObjects } from '../GridObjects/GridObjects';
import { depositModel, materialsByResource, defaultMat } from '../models/deposit';

export const PlanetResources: Component = () => {
    const { world } = useGame();

    const resourceDeposits = createMemo(() => {
        const planet = world.planet();
        if (!planet) {
            return [];
        }

        // TODO: reactivity and data updates
        const byResource: Record<string, NodeId[]> = {};

        for (const [nodeId, deposit] of planet.resources.entries()) {
            byResource[deposit.resource] ??= [];
            byResource[deposit.resource].push(nodeId);
        }

        return Object.entries(byResource).map(([resource, nodes]) => ({ resource, nodes }));
    });

    return (
        <For each={resourceDeposits()}>
            {({ resource, nodes }) => {
                return (
                    <GridObjects
                        geom={depositModel}
                        material={materialsByResource[resource] ?? defaultMat}
                        allNodes={world.planet()?.nodes ?? []}
                        nodeIds={nodes}
                        maxCount={nodes.length}
                    />
                );
            }}
        </For>
    );
};
