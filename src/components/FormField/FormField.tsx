import { Show, type ParentComponent } from 'solid-js';
import styles from './FormField.module.css';

export const FormField: ParentComponent<{
    label?: string;
    done?: boolean;
    error?: boolean;
}> = (props) => {
    return (
        <label
            class={styles.field}
            classList={{
                [styles.done]: props.done,
                [styles.error]: props.error,
            }}
        >
            <Show when={props.label}>
                <div class={styles.label}>{props.label}</div>
            </Show>
            <div class={styles.input}>{props.children}</div>
        </label>
    );
};
