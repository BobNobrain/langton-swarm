import { onCleanup, onMount } from 'solid-js';
import { KeyCode } from './input';

export type HotkeyDescriptor = {
    key: KeyCode;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    allowRepeated?: boolean;
    isEnabled?: () => boolean;
};

export type HotkeyHandler = (ev: KeyboardEvent, isRepeated: boolean) => void;
export type HotkeyReleaseHandler = (ev: KeyboardEvent) => void;

type RegisteredHotkey = {
    descriptor: HotkeyDescriptor;
    handler: HotkeyHandler;
    release: HotkeyReleaseHandler | undefined;
    active: boolean;
};

class HotkeyManager {
    private hotkeysByCode: Record<string, RegisteredHotkey[]> = {};
    keysDown: Record<string, boolean> = {};

    constructor() {
        document.addEventListener('keydown', (ev) => {
            if (shouldSkipKeydown(ev)) {
                return;
            }

            const isRepeated = this.keysDown[ev.code] ?? false;
            this.keysDown[ev.code] = true;

            const hotkeys = this.hotkeysByCode[ev.code] ?? [];
            let handled = false;

            for (const hk of hotkeys) {
                const { alt = false, shift = false, ctrl = false, isEnabled } = hk.descriptor;
                if (isEnabled && !isEnabled()) {
                    continue;
                }

                if (ev.ctrlKey !== ctrl || ev.altKey !== alt || ev.shiftKey !== shift) {
                    continue;
                }

                if (!hk.descriptor.allowRepeated && isRepeated) {
                    continue;
                }

                hk.handler(ev, isRepeated);
                hk.active = true;
                handled = true;
            }

            if (handled) {
                ev.preventDefault();
            }
        });

        document.addEventListener('keyup', (ev) => {
            this.keysDown[ev.code] = false;

            const hotkeys = this.hotkeysByCode[ev.code] ?? [];
            let handled = false;

            for (const hk of hotkeys) {
                if (!hk.release || !hk.active) {
                    continue;
                }

                const { alt = false, shift = false, ctrl = false, isEnabled } = hk.descriptor;
                if (isEnabled && !isEnabled()) {
                    continue;
                }

                if (ev.ctrlKey !== ctrl || ev.altKey !== alt || ev.shiftKey !== shift) {
                    continue;
                }

                hk.release(ev);
                handled = true;
            }

            if (handled) {
                ev.preventDefault();
            }
        });
    }

    register(descriptor: HotkeyDescriptor, handler: HotkeyHandler, releaseHandler?: HotkeyReleaseHandler) {
        this.hotkeysByCode[descriptor.key] ??= [];
        this.hotkeysByCode[descriptor.key].push({
            descriptor,
            handler,
            active: false,
            release: releaseHandler,
        });
    }

    unregister(desc: HotkeyDescriptor, handler: HotkeyHandler) {
        if (!this.hotkeysByCode[desc.key]) {
            return;
        }

        const hotkeys = this.hotkeysByCode[desc.key];
        for (let i = 0; i < hotkeys.length; i++) {
            if (hotkeys[i].handler === handler && hotkeys[i].descriptor === desc) {
                hotkeys.splice(i, 1);
                return;
            }
        }
    }
}

const hotkeyManager = new HotkeyManager();

export function createHotkey(
    descriptor: HotkeyDescriptor,
    handler: HotkeyHandler,
    releaseHandler?: HotkeyReleaseHandler,
) {
    onMount(() => {
        hotkeyManager.register(descriptor, handler, releaseHandler);

        onCleanup(() => hotkeyManager.unregister(descriptor, handler));
    });
}

export function isKeyDown(code: KeyCode): boolean {
    return hotkeyManager.keysDown[code] ?? false;
}

export function renderHotkey(hotkey: HotkeyDescriptor): string {
    let keyName: string = hotkey.key;

    if (keyName.startsWith('Key')) {
        keyName = keyName.substring(3);
    } else if (keyName.startsWith('Digit')) {
        keyName = keyName.substring(5);
    } else if (keyName.startsWith('Arrow')) {
        keyName =
            {
                ArrowUp: '⬆',
                ArrowDown: '⬇',
                ArrowLeft: '⬅',
                ArrowRight: '⮕',
            }[keyName] ?? keyName;
    } else {
        switch (keyName) {
            case 'Escape':
                keyName = 'Esc';
                break;

            case 'Enter':
                keyName = '⏎';
                break;
        }
    }

    if (hotkey.alt) {
        keyName = 'Alt+' + keyName;
    }
    if (hotkey.shift) {
        keyName = 'Shift+' + keyName;
    }
    if (hotkey.ctrl) {
        keyName = 'Ctrl+' + keyName;
    }

    return keyName;
}

function shouldSkipKeydown(ev: KeyboardEvent): boolean {
    switch ((ev.target as HTMLElement).tagName) {
        case 'INPUT':
            return ev.code !== KeyCode.Esc;

        case 'BUTTON':
            return ev.code === KeyCode.Space;

        default:
            return false;
    }
}
