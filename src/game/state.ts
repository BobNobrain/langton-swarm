import { createBlueprintDeck, type BlueprintDeck } from './deck';
import type { Engine } from './engine';
import { createGameSystems, GameUnitSystems } from './systems';
import { createGameTime, type GameTimeState } from './time';
import { createGameUIState, type GameUIState } from './ui';
import { createGameWorld, type GameWorld } from './world';

export type GameState = {
    readonly world: GameWorld;
    readonly deck: BlueprintDeck;
    readonly ui: GameUIState;
    readonly time: GameTimeState;
    readonly units: GameUnitSystems;
};

export const createGameState = (engine: Engine): GameState => {
    const time = createGameTime(engine);
    const world = createGameWorld();
    const deck = createBlueprintDeck();
    const units = createGameSystems(world, deck, engine);
    const ui = createGameUIState(units);

    const state: GameState = {
        world,
        units,
        deck,
        ui,
        time,
    };

    return state;
};
