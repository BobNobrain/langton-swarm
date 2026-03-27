import type { Ticker } from '@/game';
import { useGame } from '@/gameContext';
import { createEffect, onCleanup, onMount } from 'solid-js';

export function onTick(handler: Ticker) {
    const { engine } = useGame();

    onMount(() => {
        const id = engine.on(handler);
        onCleanup(() => engine.off(id));
    });
}

export function onTickConditional<T>(condition: () => T | null, handlerFactory: (t: T) => Ticker) {
    const { engine } = useGame();

    createEffect(() => {
        const data = condition();
        if (!data) {
            return;
        }

        const id = engine.on(handlerFactory(data));
        onCleanup(() => engine.off(id));
    });
}
