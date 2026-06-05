import { createSignal } from 'solid-js';
import { sequentialId, type ID } from '@/lib/ids';
import type { BlueprintDeck } from './deck';
import type { SavedStateValue } from '@/lib/SavedState';

export type FactionId = ID<number, 'FactionId'>;

export type Faction = {
    id: FactionId;
    name: string;
    color: string;
    isAI: boolean;
    deck: BlueprintDeck | null;
};

export type GameFactions = {
    rFactions: () => Faction[];
    readonly player: Faction;
    getFaction(id: FactionId): Faction | null;
};

export const NO_FACTION: FactionId = 0 as FactionId;

type SaveData = { fs: Omit<Faction, 'deck'>[] };

export function createFactions(savedState: SavedStateValue<SaveData>): GameFactions {
    const factionIds = sequentialId<FactionId>();

    const loaded = savedState.get(() => ({
        fs: [
            {
                id: factionIds.aquire(),
                name: 'player',
                color: '#67b740',
                isAI: false,
                // deck: null,
            },
        ],
    }));

    for (const faction of loaded.fs) {
        factionIds.lock(faction.id);
    }

    const [rFactions] = createSignal<Faction[]>(loaded.fs.map((f) => ({ ...f, deck: null })));

    savedState.onSave(() => ({ fs: rFactions().map(({ deck, ...f }) => f) }));

    return {
        player: rFactions()[0],
        rFactions,
        getFaction(id) {
            return rFactions().find((f) => f.id === id) ?? null;
        },
    };
}
