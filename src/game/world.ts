import { createSignal } from 'solid-js';
import { generatePlanet } from './worldgen/planet';
import type { Planet } from './types';

export type GameWorld = {
    seed: () => string;
    planet: () => Planet | null;

    init: (seed: string) => void;
};

export function createGameWorld(): GameWorld {
    const [getSeed, setSeed] = createSignal('');
    const [getWorld, setWorld] = createSignal<Planet | null>(null);

    return {
        seed: getSeed,
        planet: getWorld,

        init: (seed) => {
            if (getWorld() !== null) {
                throw new Error('already initialized');
            }

            setSeed(seed);
            setWorld(generatePlanet(seed));
        },
    };
}
