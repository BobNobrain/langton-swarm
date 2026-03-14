import { onCleanup, onMount } from 'solid-js';

export enum KeyCodes {
    ArrowUp = 'ArrowUp',
    ArrowDown = 'ArrowDown',
    ArrowLeft = 'ArrowLeft',
    ArrowRight = 'ArrowRight',

    KeyW = 'KeyW',
    KeyA = 'KeyA',
    KeyS = 'KeyS',
    KeyD = 'KeyD',

    Space = 'Space',
    Enter = 'Enter',
    Esc = 'Escape',
    Delete = 'Delete',
    Backspace = 'Backspace',
}

export enum MouseButton {
    Left = 0,
    Wheel = 1,
    Right = 2,
}

export function createGlobalListener<EventName extends keyof DocumentEventMap>(
    event: EventName,
    listener: (this: Document, ev: DocumentEventMap[EventName]) => void,
    options?: boolean | EventListenerOptions,
) {
    onMount(() => {
        document.addEventListener(event, listener, options);

        onCleanup(() => {
            document.removeEventListener(event, listener, options);
        });
    });
}
