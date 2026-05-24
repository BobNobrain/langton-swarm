import { Show, type ParentComponent } from 'solid-js';
import styles from './FormField.module.css';

export const FormField: ParentComponent<{
    label?: string;
    done?: boolean;
    error?: boolean;
    insetH?: boolean;
}> = (props) => {
    return (
        <label
            class={styles.field}
            classList={{
                [styles.done]: props.done,
                [styles.error]: props.error,
                [styles.insetH]: props.insetH,
            }}
            title={props.label}
        >
            <Show when={props.label}>
                <div class={styles.label}>{props.label}</div>
            </Show>
            <div class={styles.input}>{props.children}</div>
        </label>
    );
};
