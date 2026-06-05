import { SavedStatePartition } from '@/lib/SavedState';
import { createGameLoop, GameLoop, Ticker } from './loop';
import { createGameNots, type GameNots } from './nots';
import { createGameState, GameState } from './state';
import type { CreateGameProgressListener, WorldgenOptionsInput } from './types';
import { fillDefaults } from './worldgen/options';
import { createGameSaver, type GameSaver } from './saver';

export type Game = GameState & {
    start: () => void;
    stop: () => void;

    saver: GameSaver;

    gameTick: Pick<
        GameLoop,
        | 'addGameTask'
        | 'removeGameTask'
        | 'addUITask'
        | 'removeUITask'
        | 'getCurrentTick'
        | 'isPaused'
        | 'tickDurationMs'
    >;
    nots: GameNots;
};

export type GameParams = {
    tickTime?: number;
    worldgen?: WorldgenOptionsInput;
    enableTutorial?: boolean;
    initiallyPaused?: boolean;
    onProgress?: CreateGameProgressListener;

    save?: unknown;
};

export const DEFAULT_TICK_TIME = 50;

export async function createGame({
    tickTime = DEFAULT_TICK_TIME,
    enableTutorial,
    initiallyPaused,
    worldgen,
    onProgress,
    save,
}: GameParams): Promise<Game> {
    const savedState = new SavedStatePartition();
    if (save) {
        savedState.deserialize(save);
    }

    const gameTick = createGameLoop(tickTime, savedState.value('time'));
    const nots = createGameNots(gameTick, savedState.value('nots'));
    const state = await createGameState({ gameTick, nots, worldgen: fillDefaults(worldgen), onProgress, savedState });
    const saver = createGameSaver(state.world, savedState);

    const game: Game = {
        ...state,
        gameTick,
        nots,
        saver,

        start: () => {
            gameTick.start();
            if (initiallyPaused) {
                state.time.togglePause();
                gameTick.advanceOneTick();
            }
        },
        stop: () => {
            gameTick.stop();
            gameTick.clear();
        },
    };

    // @ts-expect-error For debug
    window.game = game;
    return game;
}

export type { GameState };
export type { GameLoop, Ticker };

export { getProcessorTickRate, type UnitConfiguration } from './config';
export type { BlueprintDeck, BlueprintController, BlueprintId } from './deck';
export { type Faction, type FactionId, type GameFactions, NO_FACTION } from './factions';
export type { GameNots, NotificationData } from './nots';
export {
    type KnownResourceName,
    type PlanetaryResources,
    type ResourceDeposit,
    ResourceTier,
    type ResourceUpdateEvent,
} from './resources';
export {
    type GameUnitSystems,
    type InventoryController,
    type InventoryData,
    type CPUData,
    type AssemblerData,
    type NavigatorSystemData,
    type ScannerData,
    type DynamicLocation,
    type PositionalSystemController,
    type DespawnedEventPayload,
} from './systems';
export type * from './types';
export type { HighlightedTile } from './ui';
export type { GameWorld } from './world';

export type { BsmlValue, BsmlValueType } from './program/value';
