import { createBlueprintDeck, type BlueprintDeck } from './deck';
import type { GameLoop } from './loop';
import { createGameSystems, GameUnitSystems } from './systems';
import { createGameTime, type GameTimeState } from './time';
import type { CreateGameProgressListener, WorldgenOptions } from './types';
import { createGameUIState, type GameUIState } from './ui';
import { createGameWorld, type GameWorld } from './world';

export type GameState = {
    readonly world: GameWorld;
    readonly deck: BlueprintDeck;
    readonly ui: GameUIState;
    readonly time: GameTimeState;
    readonly units: GameUnitSystems;
};

type Options = {
    worldgen: WorldgenOptions;
    gameTick: GameLoop;
    onProgress: CreateGameProgressListener | undefined;
};

export async function createGameState({ gameTick, onProgress, worldgen }: Options): Promise<GameState> {
    const time = createGameTime(gameTick);
    const world = await createGameWorld(worldgen, onProgress);
    const deck = createBlueprintDeck();
    const units = createGameSystems(world, deck, gameTick);
    const ui = createGameUIState(units);

    const state: GameState = {
        world,
        units,
        deck,
        ui,
        time,
    };

    return state;
}
