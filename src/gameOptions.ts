import type { GameParams } from './game';

export type GameOptions = Omit<GameParams, 'onProgress'>;

let gameOptions: GameOptions | null = null;

export function getGameOptions(): GameOptions {
    return (
        gameOptions ?? {
            worldgen: { seed: 'test1' },
        }
    );
}

export function setGameOptions(opts: GameOptions) {
    gameOptions = opts;
}
