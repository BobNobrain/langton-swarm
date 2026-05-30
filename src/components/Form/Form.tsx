import { Show, type ParentComponent } from 'solid-js';
import styles from './Form.module.css';

export const Form: ParentComponent<{
    preventImplicitSubmit?: boolean;
    onSubmit?: (ev: SubmitEvent) => void;
}> = (props) => {
    return (
        <form
            class={styles.form}
            onSubmit={(ev) => {
                ev.preventDefault();
                props.onSubmit?.(ev);
            }}
        >
            <Show when={props.preventImplicitSubmit}>
                <button
                    type="submit"
                    style="display:none"
                    role="none"
                    tabIndex={-1}
                    onClick={(ev) => ev.preventDefault()}
                />
            </Show>
            {props.children}
        </form>
    );
};

export const FormSection: ParentComponent = (props) => {
    return <section class={styles.section}>{props.children}</section>;
};

export const FormActions: ParentComponent<{
    align?: 'left' | 'center' | 'right';
    classList?: Record<string, boolean | undefined>;
}> = (props) => {
    return (
        <footer
            class={styles.actions}
            classList={{
                [styles.alignLeft]: props.align === 'left',
                [styles.alignCenter]: props.align === 'center',
                ...(props.classList ?? {}),
            }}
        >
            {props.children}
        </footer>
    );
};
