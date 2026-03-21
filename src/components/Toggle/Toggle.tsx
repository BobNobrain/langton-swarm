import { Show, type Component } from 'solid-js';
import styles from './Toggle.module.css';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { Dynamic } from 'solid-js/web';

export const Toggle: Component<{
    label?: string;
    as?: 'div' | 'label';
    value: boolean | undefined;
    onUpdate?: (value: boolean) => void;
    controllerRef?: ControllerRef<ToggleController>;
}> = (props) => {
    let input!: HTMLInputElement;

    provideController(
        {
            focus() {
                input.focus();
            },
        },
        () => props.controllerRef,
    );

    return (
        <Dynamic component={props.as ?? 'label'} class={styles.toggle}>
            <input
                ref={input}
                type="checkbox"
                class={styles.input}
                checked={props.value ?? false}
                onChange={(ev) => props.onUpdate?.(ev.currentTarget.checked)}
            />
            <span class={styles.icon}>
                <Show
                    when={props.value === true}
                    fallback={
                        <Show when={props.value === undefined} fallback="[ ]">
                            [?]
                        </Show>
                    }
                >
                    [x]
                </Show>
            </span>
            <Show when={props.label}>
                <span class={styles.label}>{props.label}</span>
            </Show>
        </Dynamic>
    );
};

export type ToggleController = {
    focus(): void;
};

export function createToggleController() {
    return createControllerRef<ToggleController>({
        focus() {},
    });
}
