import { createEffect, createMemo, createSignal, type Component } from 'solid-js';
import { gameState } from '@/game';
import { GridObjects } from '../GridObjects/GridObjects';
import { botModel } from '../models/bot';

export const GameBots: Component = () => {
    const [nodeIds, setNodeIds] = createSignal<number[]>([]);
    createEffect(() => {
        const nodes = gameState.world()?.nodes ?? [];
        if (!nodes.length) {
            return;
        }

        const n = 300;
        const result = new Array<number>(n);
        for (let i = 0; i < n; i++) {
            result[i] = Math.floor(Math.random() * nodes.length);
        }
        setNodeIds(result);
    });

    setInterval(() => {
        setNodeIds((old) => {
            const i = Math.floor(Math.random() * old.length);
            const copy = old.slice();

            const nodes = gameState.world()?.nodes ?? [];
            if (!nodes.length) {
                return old;
            }

            const neighbours = Array.from(nodes[copy[i]].connections.values());
            copy[i] = neighbours[Math.floor(Math.random() * neighbours.length)];
            return copy;
        });
    }, 100);

    return (
        <GridObjects
            geom={botModel.model}
            material={botModel.mat}
            allNodes={gameState.world()?.nodes ?? []}
            nodeIds={nodeIds()}
            maxCount={200}
        />
    );
};
