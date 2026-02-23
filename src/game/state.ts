import { createSignal } from 'solid-js';
import type { Planet } from './types';
import { generatePlanet } from './planet';

export type GameState = {
    seed: () => string;
    world: () => Planet | null;
};

export type GameStateController = {
    createWorld: (seed: string) => void;
};

export const createGameState = (): [GameState, GameStateController] => {
    const [getSeed, setSeed] = createSignal('');
    const [getWorld, setWorld] = createSignal<Planet | null>(null);

    const state: GameState = {
        seed: getSeed,
        world: getWorld,
    };
    const controller: GameStateController = {
        createWorld: (seed) => {
            setSeed(seed);
            setWorld(generatePlanet(seed));
        },
    };

    return [state, controller];
};
