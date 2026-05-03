import { createSignal } from 'solid-js';
import { sequentialId, type ID } from '@/lib/ids';

export type FactionId = ID<number, 'FactionId'>;

export type Faction = {
    id: FactionId;
    name: string;
    isAI: boolean;
};

export type GameFactions = {
    rFactions: () => Faction[];
    readonly player: Faction;
};

export const NO_FACTION: FactionId = 0 as FactionId;

export function createFactions(): GameFactions {
    const factionIds = sequentialId<FactionId>();

    const playerFaction: Faction = {
        id: factionIds.aquire(),
        name: 'player',
        isAI: false,
    };

    const [rFactions] = createSignal<Faction[]>([playerFaction]);

    return { player: playerFaction, rFactions };
}
