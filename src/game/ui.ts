import { createMemo, createSignal } from 'solid-js';
import type { BlueprintId } from './deck';
import type { NodeId, UnitId } from './types';
import type { GameUnitSystems } from './systems';
import { createEvent, type Event } from '@/lib/sparse';

export type HighlightedTile = {
    tileId: NodeId;
    color: 'primary' | 'white';
};

export type GameUIState = {
    rSelectedTile(): NodeId | null;
    selectTile(value: NodeId | null, opts?: { selectUnits?: boolean }): void;
    hijackTileSelection(listener: null | ((selected: NodeId | null) => boolean | void)): void;
    tileRightClick: Event<(tileId: NodeId, ev: MouseEvent) => void>;

    rHoveredTile(): NodeId | null;
    hoverTile(value: NodeId | null): void;

    rHighlightedTiles(): HighlightedTile[];
    addHighlightedTile(ht: HighlightedTile): void;
    removeHighlightedTile(tid: NodeId): void;

    rSelectedUnits(): UnitId[];
    selectUnits(ids: UnitId[]): void;
    removeSelectedUnit(id: UnitId): void;

    rDeckSelectedBlueprint: () => BlueprintId | null;
    rDeckSelectedVersion: () => number | null;
    deckSelectBlueprint(id: BlueprintId, version?: number): void;
    deckSelectVersion(version: number | null): void;
    deckUnselectBlueprint(): void;
};

export function createGameUIState(units: GameUnitSystems): GameUIState {
    const [rSelectedTile, rSetSelectedTile] = createSignal<NodeId | null>(null);
    const [rHoveredTile, rSetHoveredTile] = createSignal<NodeId | null>(null);
    const [rHighlightedTiles, rSetHighlightedTiles] = createSignal<Record<NodeId, HighlightedTile>>({});
    const [rSelectedUnits, rSetSelectedUnits] = createSignal<UnitId[]>([]);

    let tileSelectionHijacker: ((selected: NodeId | null) => boolean | void) | null = null;

    const [rDeckSelectedBlueprint, rSetDeckSelectedBlueprint] = createSignal<BlueprintId | null>(null);
    const [rDeckSelectedVersion, rSetDeckSelectedVersion] = createSignal<number | null>(null);

    return {
        rSelectedTile,
        rSelectedUnits,
        rHoveredTile,
        rHighlightedTiles: createMemo(() => Object.values(rHighlightedTiles())),

        selectTile(value, { selectUnits } = {}) {
            if (tileSelectionHijacker) {
                const shouldKeep = tileSelectionHijacker(value);
                if (!shouldKeep) {
                    tileSelectionHijacker = null;
                }
                return;
            }

            rSetSelectedTile(value);
            if (selectUnits) {
                rSetSelectedUnits(value === null ? [] : units.positions.findAtPosition(value, { strict: false }));
            }
        },
        hoverTile: rSetHoveredTile,
        hijackTileSelection(listener) {
            // TODO: should these stack?
            tileSelectionHijacker = listener;
        },

        addHighlightedTile(ht) {
            rSetHighlightedTiles((old) => ({ ...old, [ht.tileId]: ht }));
        },
        removeHighlightedTile(tid) {
            rSetHighlightedTiles((old) => {
                if (!old[tid]) {
                    return old;
                }

                const copy = { ...old };
                delete copy[tid];
                return copy;
            });
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

        rDeckSelectedBlueprint,
        rDeckSelectedVersion,
        deckSelectBlueprint(id, version) {
            rSetDeckSelectedBlueprint(id);
            rSetDeckSelectedVersion(version ?? null);
        },
        deckSelectVersion(version) {
            rSetDeckSelectedVersion(version);
        },
        deckUnselectBlueprint() {
            rSetDeckSelectedBlueprint(null);
            rSetDeckSelectedVersion(null);
        },

        tileRightClick: createEvent(),
    };
}
