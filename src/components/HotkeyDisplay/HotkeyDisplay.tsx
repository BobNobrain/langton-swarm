import type { Component } from 'solid-js';
import { renderHotkey, type HotkeyDescriptor } from '@/lib/hotkey';
import styles from './HotkeyDisplay.module.css';

export const HotkeyDisplay: Component<{
    hotkey: HotkeyDescriptor | 'rmb';
    classList?: Record<string, boolean | undefined>;
}> = (props) => {
    return (
        <span
            class={styles.hotkey}
            classList={{
                [styles.mouseButton]: typeof props.hotkey === 'string',
                ...(props.classList ?? {}),
            }}
        >
            {typeof props.hotkey === 'string' ? (
                <span class={styles.mouseButtonFill}></span>
            ) : (
                renderHotkey(props.hotkey)
            )}
        </span>
    );
};
