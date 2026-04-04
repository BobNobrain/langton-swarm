import { Show, type ParentComponent } from 'solid-js';
import { createHotkey, renderHotkey, type HotkeyDescriptor } from '@/lib/hotkey';
import styles from './Button.module.css';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { Symbols } from '@/lib/ascii';

type ButtonStyle = 'primary' | 'secondary' | 'text';

const cls: Record<ButtonStyle, string> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    text: styles.btnText,
};

export type ButtonController = {
    focus(): void;
};

export const Button: ParentComponent<{
    type?: 'button' | 'submit';
    style?: ButtonStyle;
    disabled?: boolean;
    inline?: boolean;
    vibrantFocus?: boolean;
    hotkey?: HotkeyDescriptor;
    rmbHotkey?: boolean;
    onClick?: (ev: MouseEvent | KeyboardEvent) => void;
    onMouseEnter?: (ev: MouseEvent) => void;
    onMouseLeave?: (ev: MouseEvent) => void;
    controllerRef?: ControllerRef<ButtonController>;
}> = (props) => {
    if (props.hotkey) {
        createHotkey(
            {
                ...props.hotkey,
                isEnabled: () => !props.disabled && (props.hotkey?.isEnabled?.() ?? true),
            },
            (ev) => props.onClick?.(ev),
        );
    }

    let button!: HTMLButtonElement;

    provideController(
        {
            focus() {
                button.focus();
            },
        },
        () => props.controllerRef,
    );

    return (
        <button
            ref={button}
            type={props.type ?? 'button'}
            classList={{
                [styles.button]: true,
                [cls[props.style ?? 'secondary']]: true,
                [styles.disabled]: props.disabled,
                [styles.clickable]: Boolean(props.onClick),
                [styles.inline]: props.inline,
                [styles.vibrantFocus]: props.vibrantFocus,
            }}
            disabled={props.disabled}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
        >
            <span class={styles.label}>{props.children}</span>
            <Show when={props.hotkey || props.rmbHotkey}>
                <span
                    class={styles.hotkey}
                    classList={{
                        [styles.mouseButton]: props.rmbHotkey && !props.hotkey,
                    }}
                >
                    {props.hotkey ? renderHotkey(props.hotkey) : <span class={styles.mouseButtonFill}></span>}
                </span>
            </Show>
        </button>
    );
};

export function createButtonController() {
    return createControllerRef<ButtonController>({
        focus() {},
    });
}
