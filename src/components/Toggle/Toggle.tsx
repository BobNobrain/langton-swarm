import { Show, type Component } from 'solid-js';
import styles from './Toggle.module.css';

export const Toggle: Component<{
    label: string;
    value: boolean;
    onUpdate: (value: boolean) => void;
}> = (props) => {
    return (
        <label class={styles.toggle}>
            <input
                type="checkbox"
                class={styles.input}
                checked={props.value}
                onChange={(ev) => props.onUpdate(ev.currentTarget.checked)}
            />
            <span class={styles.icon}>
                <Show when={props.value} fallback="[ ]">
                    [x]
                </Show>
            </span>
            <span class={styles.label}>{props.label}</span>
        </label>
    );
};
