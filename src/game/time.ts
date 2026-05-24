import { createSignal } from 'solid-js';
import type { GameLoop } from './loop';

export type GameTimeState = {
    rIsPaused: () => boolean;
    rCurrentTick: () => number;

    togglePause(): void;
    getGameMonotonicTime(): number;
    advanceOneTick(): void;
};

export function createGameTime(gameLoop: GameLoop): GameTimeState {
    const [rIsPaused, rSetIsPaused] = createSignal(false);
    const [rCurrentTick, rSetCurrentTick] = createSignal(0);

    let monotonicTime = 0;
    gameLoop.addGameTask((tick) => {
        monotonicTime = tick * gameLoop.tickDurationMs;
        rSetCurrentTick(tick);
    });

    return {
        rIsPaused,
        rCurrentTick,
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
