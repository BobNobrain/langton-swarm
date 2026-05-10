import { createSignal } from 'solid-js';
import { sequentialId, type ID } from '@/lib/ids';
import type { BlueprintDeck } from './deck';

export type FactionId = ID<number, 'FactionId'>;

export type Faction = {
    id: FactionId;
    name: string;
    isAI: boolean;
    deck: BlueprintDeck | null;
};

export type GameFactions = {
    rFactions: () => Faction[];
    readonly player: Faction;
    getFaction(id: FactionId): Faction | null;
};

export const NO_FACTION: FactionId = 0 as FactionId;

export function createFactions(): GameFactions {
    const factionIds = sequentialId<FactionId>();

    const playerFaction: Faction = {
        id: factionIds.aquire(),
        name: 'player',
        isAI: false,
        deck: null,
    };

    const [rFactions] = createSignal<Faction[]>([playerFaction]);

    return {
        player: playerFaction,
        rFactions,
        getFaction(id) {
            return rFactions().find((f) => f.id === id) ?? null;
        },
    };
}
