import { createSignal } from 'solid-js';

export type Faction = {
    id: number;
    name: string;
    isAI: boolean;
};

export type GameFactions = {
    rFactions: () => Faction[];
};

export function createFactions(): GameFactions {
    const [rFactions] = createSignal<Faction[]>([
        {
            id: 0,
            name: 'player',
            isAI: false,
        },
    ]);

    return { rFactions };
}
