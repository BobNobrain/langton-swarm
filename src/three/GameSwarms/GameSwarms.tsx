import { createEffect, createMemo, createSignal, For, type Component } from 'solid-js';
import { SurfaceNode, NodeId, UnitModelType } from '@/game';
import { useGame } from '@/gameContext';
import { GridObjects } from '../GridObjects/GridObjects';
import { onBeforeRepaint } from '../hooks/handlers';
import { getUnitModel } from '../models/units';

const Swarm: Component<{ modelType: UnitModelType; nodes: SurfaceNode[] }> = (props) => {
    const { deck, units } = useGame();
    const [getPositions, setPositions] = createSignal<NodeId[]>([]);
    let lastTickUpdated = 0;

    createEffect(() => {
        const rIds = units.signals.getUnitIdsSignal(props.modelType);

        const result: NodeId[] = [];
        for (const unitId of rIds()) {
            const state = units.unitStates[unitId];
            if (!state) {
                continue;
            }

            result.push(state.location);
        }

        setPositions(result);
    });

    const model = createMemo(() => getUnitModel(props.modelType));

    onBeforeRepaint(() => {
        const currentPositions: NodeId[] = [];
        const signalUpdatedTo = lastTickUpdated;

        // TODO: this signal does not care about unit ordering
        for (const unitId of units.signals.getUnitIdsSignal(props.modelType)()) {
            const state = units.unitStates[unitId];
            if (!state) {
                continue;
            }

            currentPositions.push(state.location);
            lastTickUpdated = Math.max(lastTickUpdated, units.getLastUpdatedTime(unitId));
        }

        if (signalUpdatedTo !== lastTickUpdated) {
            setPositions(currentPositions);
        }
    });

    return (
        <GridObjects
            geom={model().geom}
            material={model().mat}
            allNodes={props.nodes}
            nodeIds={getPositions()}
            maxCount={200}
        />
    );
};

const ALL_MODELS = [UnitModelType.Mother, UnitModelType.Rover];

export const GameSwarms: Component = () => {
    const game = useGame();
    const nodes = createMemo(() => game.world.planet()?.nodes ?? []);

    return (
        <For each={ALL_MODELS}>
            {(modelType) => {
                return <Swarm nodes={nodes()} modelType={modelType} />;
            }}
        </For>
    );
};
