import { Show, type ParentComponent } from 'solid-js';
import { createHotkey, renderHotkey, type HotkeyDescriptor } from '@/lib/hotkey';
import styles from './Button.module.css';

type ButtonStyle = 'primary' | 'secondary' | 'text';

const cls: Record<ButtonStyle, string> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    text: styles.btnText,
};

export const Button: ParentComponent<{
    style?: ButtonStyle;
    disabled?: boolean;
    hotkey?: HotkeyDescriptor;
    onClick?: (ev: MouseEvent | KeyboardEvent) => void;
    onMouseEnter?: (ev: MouseEvent) => void;
    onMouseLeave?: (ev: MouseEvent) => void;
}> = (props) => {
    if (props.hotkey) {
        createHotkey(props.hotkey, (ev) => props.onClick?.(ev));
    }

    return (
        <button
            type="button"
            classList={{
                [styles.button]: true,
                [cls[props.style ?? 'secondary']]: true,
                [styles.disabled]: props.disabled,
                [styles.clickable]: Boolean(props.onClick),
            }}
            disabled={props.disabled}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
        >
            <span class={styles.label}>{props.children}</span>
            <Show when={props.hotkey}>
                <span class={styles.hotkey}>{renderHotkey(props.hotkey!)}</span>
            </Show>
        </button>
    );
};
