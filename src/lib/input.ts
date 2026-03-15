import { onCleanup, onMount } from 'solid-js';

export enum KeyCode {
    ArrowUp = 'ArrowUp',
    ArrowDown = 'ArrowDown',
    ArrowLeft = 'ArrowLeft',
    ArrowRight = 'ArrowRight',

    KeyW = 'KeyW',
    KeyA = 'KeyA',
    KeyS = 'KeyS',
    KeyD = 'KeyD',

    Digit1 = 'Digit1',
    Digit2 = 'Digit2',
    Digit3 = 'Digit3',
    Digit4 = 'Digit4',
    Digit5 = 'Digit5',
    Digit6 = 'Digit6',
    Digit7 = 'Digit7',
    Digit8 = 'Digit8',
    Digit9 = 'Digit9',
    Digit0 = 'Digit0',

    Space = 'Space',
    Enter = 'Enter',
    Esc = 'Escape',
    Delete = 'Delete',
    Backspace = 'Backspace',
}

export const DIGIT_KEY_CODES = [
    KeyCode.Digit1,
    KeyCode.Digit2,
    KeyCode.Digit3,
    KeyCode.Digit4,
    KeyCode.Digit5,
    KeyCode.Digit6,
    KeyCode.Digit7,
    KeyCode.Digit8,
    KeyCode.Digit9,
    KeyCode.Digit0,
] as const;

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
