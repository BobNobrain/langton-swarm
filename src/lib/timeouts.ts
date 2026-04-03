import { onCleanup } from 'solid-js';

export type TimeoutSetter = {
    schedule<F extends (...args: never) => unknown>(fn: F, tMs?: number | undefined, ...args: Parameters<F>): void;
    clear(): void;
};

export function createTimeout(defaultTimeout = 0): TimeoutSetter {
    let timeoutId: number | undefined;

    onCleanup(() => {
        clearTimeout(timeoutId);
    });

    return {
        schedule(fn, tMs, ...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(fn, tMs ?? defaultTimeout, ...args);
        },
        clear() {
            clearTimeout(timeoutId);
        },
    };
}

export function sleep(nMs = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, nMs));
}
