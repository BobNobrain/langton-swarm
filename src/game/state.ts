import { createGameCamera, type GameCamera } from './camera';
import { createBlueprintDeck, type BlueprintDeck } from './deck';
import { createFactions, type GameFactions } from './factions';
import type { GameLoop } from './loop';
import { createGameSystems, GameUnitSystems } from './systems';
import { createGameTime, type GameTimeState } from './time';
import type { CreateGameProgressListener, WorldgenOptions } from './types';
import { createGameUIState, type GameUIState } from './ui';
import { createGameWorld, type GameWorld } from './world';

export type GameState = {
    readonly world: GameWorld;
    readonly playerDeck: BlueprintDeck;
    readonly ui: GameUIState;
    readonly time: GameTimeState;
    readonly units: GameUnitSystems;
    readonly camera: GameCamera;
    readonly factions: GameFactions;
};

type Options = {
    worldgen: WorldgenOptions;
    gameTick: GameLoop;
    onProgress: CreateGameProgressListener | undefined;
};

export async function createGameState({ gameTick, onProgress, worldgen }: Options): Promise<GameState> {
    const time = createGameTime(gameTick);
    const world = await createGameWorld(gameTick, worldgen, onProgress);

    const factions = createFactions();
    const playerDeck = createBlueprintDeck(factions.player.id);
    factions.player.deck = playerDeck;

    const units = createGameSystems(world, gameTick, factions);
    const ui = createGameUIState(units);
    const camera = createGameCamera(world.radius);

    const state: GameState = {
        world,
        units,
        playerDeck,
        ui,
        time,
        camera,
        factions,
    };

    return state;
}
