import { createSignal } from 'solid-js';
import type { NodeId } from './types';
import type { GameSwarms, SwarmUnitId } from './swarms';

export type GameUIState = {
    rSelectedTile(): NodeId | null;
    selectTile(value: NodeId | null): void;

    rSelectedUnits(): SwarmUnitId[];
    selectUnits(ids: SwarmUnitId[]): void;
    removeSelectedUnit(id: SwarmUnitId): void;
};

export function createGameUIState(swarms: GameSwarms): GameUIState {
    const [rSelectedTile, rSetSelectedTile] = createSignal<NodeId | null>(null);
    const [rSelectedUnits, rSetSelectedUnits] = createSignal<SwarmUnitId[]>([]);

    return {
        rSelectedTile,
        rSelectedUnits,

        selectTile(value) {
            rSetSelectedTile(value);
            if (value !== null) {
                rSetSelectedUnits(Array.from(swarms.findUnitsByLocation(value)));
            } else {
                rSetSelectedUnits([]);
            }
        },

        selectUnits(ids) {
            rSetSelectedUnits(ids);
        },
        removeSelectedUnit(id) {
            rSetSelectedUnits((old) => {
                const idx = old.indexOf(id);
                if (idx === -1) {
                    return old;
                }

                const copy = old.slice();
                copy.splice(idx, 1);
                return copy;
            });
        },
    };
}
