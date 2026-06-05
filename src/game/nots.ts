import { createSignal } from 'solid-js';
import type { GameLoop } from './loop';
import type { UnitId } from './types';
import type { SavedStateValue } from '@/lib/SavedState';

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

type SaveData = { v: 1; ns: NotificationData[]; r: number };

export function createGameNots(gameTick: GameLoop, savedState: SavedStateValue<SaveData>): GameNots {
    const loaded = savedState.get(() => ({ v: 1, ns: [], r: -1 }));

    const [rNots, rSetNots] = createSignal<NotificationData[]>(loaded.ns);
    const [rReadUntil, rSetReadUntil] = createSignal(loaded.r);

    savedState.onSave(() => ({ v: 1, ns: rNots(), r: rReadUntil() }));

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
