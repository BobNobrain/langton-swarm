import { createBlueprintDeck, type BlueprintDeck } from './deck';
import type { Engine } from './engine';
import { createGameSwarms, type GameSwarms } from './swarms';
import { createGameTime, type GameTimeState } from './time';
import { createGameUIState, type GameUIState } from './ui';
import { createGameWorld, type GameWorld } from './world';

export type GameState = {
    readonly world: GameWorld;
    readonly swarms: GameSwarms;
    readonly deck: BlueprintDeck;
    readonly ui: GameUIState;
    readonly time: GameTimeState;
};

export const createGameState = (engine: Engine): GameState => {
    const time = createGameTime(engine);
    const world = createGameWorld();
    const deck = createBlueprintDeck();
    const swarms = createGameSwarms(deck, engine, world);
    const ui = createGameUIState(swarms);

    const state: GameState = {
        world,
        swarms,
        deck,
        ui,
        time,
    };

    return state;
};
