import { type Component } from 'solid-js';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import styles from './TextInput.module.css';

export type TextInputController = {
    input: HTMLInputElement | null;
};

export type TextInputProps = {
    value: string;
    onUpdate?: (value: string) => void;

    placeholder?: string;
    readonly?: boolean;
    disabled?: boolean;
    autofocus?: boolean;

    onFocus?: (ev: FocusEvent) => void;
    onBlur?: (ev: FocusEvent) => void;
    onKeyDown?: (ev: KeyboardEvent) => void;
    onKeyUp?: (ev: KeyboardEvent) => void;
    onClick?: (ev: MouseEvent) => void;

    controllerRef?: ControllerRef<TextInputController>;

    dark?: boolean;
    allowsReturnHotkey?: boolean;
};

export const TextInput: Component<TextInputProps> = (props) => {
    let input!: HTMLInputElement;
    provideController(
        {
            get input() {
                return input ?? null;
            },
        },
        () => props.controllerRef,
    );

    return (
        <input
            ref={input}
            type="text"
            class={styles.input}
            classList={{ [styles.dark]: props.dark }}
            value={props.value}
            onInput={(el) => props.onUpdate?.(el.target.value)}
            readonly={props.readonly}
            placeholder={props.placeholder}
            disabled={props.disabled}
            autofocus={props.autofocus}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            onKeyDown={props.onKeyDown}
            onKeyUp={props.onKeyUp}
            onClick={props.onClick}
            data-allowsreturnhotkey={props.allowsReturnHotkey ? '1' : undefined}
        />
    );
};

export function createTextInputController() {
    return createControllerRef<TextInputController>({
        input: null,
    });
}
