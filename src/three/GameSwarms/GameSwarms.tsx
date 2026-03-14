import { createEffect, createMemo, createSignal, For, type Component } from 'solid-js';
import type { SurfaceNode, NodeId, SwarmId, SwarmBotId } from '@/game';
import { useGame } from '@/gameContext';
import { GridObjects } from '../GridObjects/GridObjects';
import { botModel } from '../models/bot';
import { onBeforeRepaint } from '../hooks/handlers';

const Swarm: Component<{ swarmId: SwarmId; nodes: SurfaceNode[] }> = (props) => {
    const { swarms } = useGame();
    const [getPositions, setPositions] = createSignal<NodeId[]>([]);
    let lastTickUpdated = 0;

    createEffect(() => {
        const swarm = swarms.getSwarmData(props.swarmId);
        if (!swarm) {
            return [];
        }

        const result: NodeId[] = [];
        for (const botId of swarm.rUnitIds()) {
            const state = swarm.botStates[botId];
            if (!state) {
                continue;
            }

            result.push(state.unit.location);
        }

        setPositions(result);
    });

    onBeforeRepaint(() => {
        const swarm = swarms.getSwarmData(props.swarmId);
        if (!swarm) {
            return;
        }

        const currentPositions: NodeId[] = [];
        const signalUpdatedTo = lastTickUpdated;

        // TODO: rBotIds() does not care about bot ordering
        for (const botId of swarm.rUnitIds()) {
            const state = swarm.botStates[botId];
            if (!state) {
                continue;
            }

            currentPositions.push(state.unit.location);
            lastTickUpdated = Math.max(lastTickUpdated, state.lastTickId);
        }

        if (signalUpdatedTo !== lastTickUpdated) {
            setPositions(currentPositions);
        }
    });

    return (
        <GridObjects
            geom={botModel.model}
            material={botModel.mat}
            allNodes={props.nodes}
            nodeIds={getPositions()}
            maxCount={200}
        />
    );
};

export const GameSwarms: Component = () => {
    const game = useGame();
    const nodes = createMemo(() => game.world.planet()?.nodes ?? []);

    return (
        <For each={game.swarms.rSwarmIds()}>
            {(swarmId) => {
                return <Swarm nodes={nodes()} swarmId={swarmId} />;
            }}
        </For>
    );
};
