import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

export type ControllerRef<T> = (value: T | null) => void;

export function provideController<T>(controller: T, refGetter: () => ControllerRef<T> | undefined) {
    createEffect(() => {
        const ref = refGetter();
        if (!ref) {
            return;
        }

        ref(controller);
        onCleanup(() => {
            ref(null);
        });
    });
}

export function createControllerRef<T>(): { ref: ControllerRef<T>; rGet: () => T | null };
export function createControllerRef<T>(defaultValue: T): { ref: ControllerRef<T>; rGet: () => T };
export function createControllerRef<T>(defaultValue?: T): { ref: ControllerRef<T>; rGet: () => T | null } {
    const [rGet, rSet] = createSignal<T | null>(defaultValue ?? null);

    return {
        ref: (value) => {
            rSet((value === null ? (defaultValue ?? null) : value) as never);
        },
        rGet,
    };
}
