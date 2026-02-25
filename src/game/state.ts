import { createBlueprintDeck, type BlueprintDeck } from './deck';
import type { Engine } from './engine';
import { createGameSwarms, type GameSwarms } from './swarms';
import { createGameWorld, type GameWorld } from './world';

export type GameState = {
    readonly world: GameWorld;
    readonly swarms: GameSwarms;
    readonly deck: BlueprintDeck;
};

export const createGameState = (engine: Engine): GameState => {
    const world = createGameWorld();
    const deck = createBlueprintDeck();
    const swarms = createGameSwarms(deck, engine, world);

    const state: GameState = {
        world,
        swarms,
        deck,
    };

    return state;
};
