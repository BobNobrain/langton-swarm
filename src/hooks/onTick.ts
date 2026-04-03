import type { Ticker } from '@/game';
import { useGame } from '@/gameContext';
import { createEffect, onCleanup, onMount } from 'solid-js';

export function onTick(handler: Ticker) {
    const { gameTick: engine } = useGame();

    onMount(() => {
        const id = engine.addUITask(handler);
        onCleanup(() => engine.removeUITask(id));
    });
}

export function onTickConditional<T>(condition: () => T | null, handlerFactory: (t: T) => Ticker) {
    const { gameTick: engine } = useGame();

    createEffect(() => {
        const data = condition();
        if (!data) {
            return;
        }

        const ticker = handlerFactory(data);
        ticker(engine.getCurrentTick());
        const id = engine.addUITask(ticker);
        onCleanup(() => engine.removeUITask(id));
    });
}
