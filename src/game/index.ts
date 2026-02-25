import { createEngine, Engine, Ticker } from './engine';
import { createGameState, GameState } from './state';

export type Game = GameState & {
    start: () => void;
    stop: () => void;

    engine: Pick<Engine, 'on' | 'off'>;
};

export type GameParams = {
    tickTime?: number;
    worldSeed?: string;
};

export const DEFAULT_TICK_TIME = 50;
export const DEFAULT_SEED = 'deadmouse';

export function createGame({ tickTime = DEFAULT_TICK_TIME, worldSeed = DEFAULT_SEED }: GameParams): Game {
    const engine = createEngine(tickTime);
    const state = createGameState(engine);

    return {
        ...state,
        engine,

        start: () => {
            state.world.init(worldSeed);
            engine.start();
        },
        stop: () => {
            engine.stop();
            engine.clear();
        },
    };
}

export type { GameState };
export type { Engine, Ticker };

export type { BlueprintDeck, BlueprintDeckCard } from './deck';
export type { Swarm, SwarmBotData, SwarmBotId, GameSwarms } from './swarms';
export type * from './types';
export type { GameWorld } from './world';
