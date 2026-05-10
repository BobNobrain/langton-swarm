import { createSignal } from 'solid-js';
import type { GameLoop } from './loop';

export type GameTimeState = {
    rIsPaused: () => boolean;

    togglePause(): void;
    getGameMonotonicTime(): number;
    advanceOneTick(): void;
};

export function createGameTime(gameLoop: GameLoop): GameTimeState {
    const [rIsPaused, rSetIsPaused] = createSignal(false);
    let monotonicTime = 0;
    gameLoop.addGameTask((tick) => {
        monotonicTime = tick * gameLoop.tickDurationMs;
    });

    return {
        rIsPaused,
        togglePause() {
            rSetIsPaused((wasPaused) => {
                if (wasPaused) {
                    gameLoop.resume();
                } else {
                    gameLoop.pause();
                }
                return !wasPaused;
            });
        },
        advanceOneTick() {
            if (!gameLoop.isPaused()) {
                return;
            }

            gameLoop.advanceOneTick();
        },

        // TODO: more precision for animating stuff?
        getGameMonotonicTime: () => monotonicTime,
    };
}
