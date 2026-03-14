import { createSignal } from 'solid-js';
import type { Engine } from './engine';

export type GameTimeState = {
    rIsPaused: () => boolean;

    togglePause(): void;
    getGameMonotonicTime(): number;
};

export function createGameTime(engine: Engine): GameTimeState {
    const [rIsPaused, rSetIsPaused] = createSignal(false);
    let monotonicTime = 0;
    engine.on((tick) => {
        monotonicTime = tick * engine.tickDurationMs;
    });

    return {
        rIsPaused,
        togglePause() {
            rSetIsPaused((wasPaused) => {
                if (wasPaused) {
                    engine.start();
                } else {
                    engine.stop();
                }
                return !wasPaused;
            });
        },

        // TODO: more precision for animating stuff?
        getGameMonotonicTime: () => monotonicTime,
    };
}
