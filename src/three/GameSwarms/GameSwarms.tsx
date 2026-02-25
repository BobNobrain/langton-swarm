import { createEffect, createMemo, createSignal, For, type Component } from 'solid-js';
import type { Swarm, SurfaceNode } from '@/game';
import { GridObjects } from '../GridObjects/GridObjects';
import { botModel } from '../models/bot';
import { useGame } from '../../gameContext';

const Swarm: Component<{ swarm: Swarm; nodes: SurfaceNode[] }> = (props) => {
    const nodeIds = createMemo(() => {
        return props.swarm.states().map((state) => state.bot.location);
    });

    return (
        <GridObjects
            geom={botModel.model}
            material={botModel.mat}
            allNodes={props.nodes}
            nodeIds={nodeIds()}
            maxCount={200}
        />
    );
};

export const GameSwarms: Component = () => {
    // const [nodeIds, setNodeIds] = createSignal<number[]>([]);
    const game = useGame();

    // createEffect(() => {
    //     const nodes = game.state.world()?.nodes ?? [];
    //     if (!nodes.length) {
    //         return;
    //     }

    //     const n = 300;
    //     const result = new Array<number>(n);
    //     for (let i = 0; i < n; i++) {
    //         result[i] = Math.floor(Math.random() * nodes.length);
    //     }
    //     setNodeIds(result);
    // });

    // setInterval(() => {
    //     setNodeIds((old) => {
    //         const i = Math.floor(Math.random() * old.length);
    //         const copy = old.slice();

    //         const nodes = game.state.world()?.nodes ?? [];
    //         if (!nodes.length) {
    //             return old;
    //         }

    //         const neighbours = Array.from(nodes[copy[i]].connections.values());
    //         copy[i] = neighbours[Math.floor(Math.random() * neighbours.length)];
    //         return copy;
    //     });
    // }, 100);

    const nodes = createMemo(() => game.world.planet()?.nodes ?? []);

    return (
        <For each={game.swarms.list()}>
            {(swarm) => {
                return <Swarm nodes={nodes()} swarm={swarm} />;
            }}
        </For>
    );
};
