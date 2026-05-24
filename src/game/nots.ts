import { createSignal } from 'solid-js';
import type { GameLoop } from './loop';
import type { UnitId } from './types';

export type NotificationData = {
    text: string;
    author: UnitId;
    createdAtTick: number;
};

export type GameNots = {
    rNots: () => NotificationData[];
    rReadUntil: () => number;

    post(author: UnitId, text: string): void;
    readAll(): void;
};

const MAX_NOTS = 100;

export function createGameNots(gameTick: GameLoop): GameNots {
    const [rNots, rSetNots] = createSignal<NotificationData[]>([]);
    const [rReadUntil, rSetReadUntil] = createSignal(-1);

    return {
        rNots,
        rReadUntil,

        post(author, text) {
            rSetNots((old) => {
                const not: NotificationData = {
                    author,
                    text,
                    createdAtTick: gameTick.getCurrentTick(),
                };

                if (old.length >= MAX_NOTS) {
                    const result = old.slice(old.length - MAX_NOTS, old.length);
                    result.push(not);
                    return result;
                }

                return [...old, not];
            });
        },

        readAll() {
            rSetReadUntil(gameTick.getCurrentTick());
        },
    };
}
