import type { SavedStatePartition } from '@/lib/SavedState';
import { createGameCamera, type GameCamera } from './camera';
import { createBlueprintDeck, type BlueprintDeck } from './deck';
import { createFactions, type GameFactions } from './factions';
import type { GameLoop } from './loop';
import type { GameNots } from './nots';
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
    nots: GameNots;
    onProgress: CreateGameProgressListener | undefined;
    savedState: SavedStatePartition;
};

export async function createGameState({
    gameTick,
    nots,
    onProgress,
    worldgen,
    savedState,
}: Options): Promise<GameState> {
    const time = createGameTime(gameTick);
    const world = await createGameWorld(gameTick, worldgen, onProgress, savedState.partition('world'));

    const factions = createFactions(savedState.value('factions'));
    const playerDeck = createBlueprintDeck(factions.player.id, savedState.value('deck'));
    factions.player.deck = playerDeck;

    const units = createGameSystems(world, gameTick, factions, nots, savedState.partition('units'));
    const ui = createGameUIState(units); // should not be saved
    const camera = createGameCamera(world.radius, savedState.value('cam'));

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
