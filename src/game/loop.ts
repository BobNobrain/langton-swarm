import type { SavedStateValue } from '@/lib/SavedState';
import { createSparseCollection } from '@/lib/sparse';

export type Ticker = (tick: number) => void;

export type GameLoop = {
    addGameTask: (t: Ticker) => number;
    removeGameTask: (id: number) => void;

    addUITask: (t: Ticker) => number;
    removeUITask: (id: number) => void;

    start: () => void;
    stop: () => void;
    clear: () => void;

    pause(): void;
    resume(): void;
    advanceOneTick(): void;

    getCurrentTick: () => number;
    isPaused: () => boolean;
    readonly tickDurationMs: number;
};

type SaveData = { v: 1; t: number; p: boolean };

export function createGameLoop(tickTime: number, savedState: SavedStateValue<SaveData>): GameLoop {
    const loaded = savedState.get(() => ({ v: 1, t: 0, p: false }));

    const gameTasks = createSparseCollection<Ticker>();
    const uiTasks = createSparseCollection<Ticker>();

    let intervalId: number;
    let tick = loaded.t;
    let paused = loaded.p;

    const loop = () => {
        if (!paused) {
            for (const t of gameTasks.all()) {
                t(tick);
            }
        }

        for (const t of uiTasks.all()) {
            t(tick);
        }

        if (!paused) {
            ++tick;
        }
    };

    savedState.onSave(() => ({ v: 1, t: tick, p: paused }));

    return {
        addGameTask: (t) => {
            return gameTasks.add(t);
        },
        removeGameTask: (id) => {
            gameTasks.delete(id);
        },

        addUITask(t) {
            return uiTasks.add(t);
        },
        removeUITask(id) {
            uiTasks.delete(id);
        },

        clear: () => {
            gameTasks.clear();
            uiTasks.clear();
        },

        start: () => {
            intervalId = window.setInterval(loop, tickTime);
        },
        stop: () => {
            clearInterval(intervalId);
        },

        pause() {
            paused = true;
        },
        resume() {
            paused = false;
        },
        advanceOneTick() {
            paused = false;
            loop();
            paused = true;
        },

        getCurrentTick: () => tick,
        isPaused: () => paused,
        tickDurationMs: tickTime,
    };
}
