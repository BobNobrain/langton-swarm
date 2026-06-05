import { createSave } from '@/lib/saves';
import type { SavedStatePartition } from '@/lib/SavedState';
import type { GameWorld } from './world';
import { createSignal } from 'solid-js';

export type GameSaver = {
    rIsSaving: () => boolean;
    save(): Promise<void>;
};

export function createGameSaver(world: GameWorld, savedState: SavedStatePartition): GameSaver {
    const [rIsSaving, rSetIsSaving] = createSignal(false);

    return {
        rIsSaving,
        async save() {
            if (rIsSaving()) {
                return;
            }

            const state = savedState.serialize();
            const worldSize = world.graph.size();
            const worldSeed = world.seed;

            rSetIsSaving(true);
            try {
                await createSave({ worldSize, worldSeed, data: state });
            } finally {
                rSetIsSaving(false);
            }
        },
    };
}
