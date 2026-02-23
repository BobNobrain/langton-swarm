import { createGameState, GameState, GameStateController } from './state';

export const [gameState, gameController] = createGameState();
export type { GameState, GameStateController };
