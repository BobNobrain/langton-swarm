import { createGameLoop, GameLoop, Ticker } from './loop';
import { createGameState, GameState } from './state';
import type { CreateGameProgressListener, NodeId, WorldgenOptionsInput } from './types';
import { fillDefaults } from './worldgen/options';

export type Game = GameState & {
    start: () => void;
    stop: () => void;

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
};

export type GameParams = {
    tickTime?: number;
    worldgen?: WorldgenOptionsInput;
    onProgress?: CreateGameProgressListener;
};

export const DEFAULT_TICK_TIME = 50;

export async function createGame({ tickTime = DEFAULT_TICK_TIME, worldgen, onProgress }: GameParams): Promise<Game> {
    const gameTick = createGameLoop(tickTime);
    const state = await createGameState({ gameTick, worldgen: fillDefaults(worldgen), onProgress });

    const game: Game = {
        ...state,
        gameTick,

        start: () => {
            gameTick.start();
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
export type { GameLoop as Engine, Ticker };

export { getProcessorTickRate, type UnitConfiguration } from './config';
export type { BlueprintDeck, BlueprintController, BlueprintId } from './deck';
export {
    type GameUnitSystems,
    UnitModelType,
    type InventoryController,
    type InventoryData,
    type CPUData,
    type AssemblerData,
    type NavigatorSystemData,
    type ScannerData,
} from './systems';
export type * from './types';
export type { HighlightedTile } from './ui';
export type { GameWorld } from './world';

export type { BsmlValue, BsmlValueType } from './program/value';
