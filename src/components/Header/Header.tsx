import { Show, type JSX, type ParentComponent } from 'solid-js';
import styles from './Header.module.css';

export const Heading: ParentComponent<{ size?: 'md' | 'sm' | 'lg'; withMargin?: boolean }> = (props) => {
    return (
        <h2
            class={styles.heading}
            classList={{
                [styles.sizeMd]: (props.size ?? 'md') === 'md',
                [styles.sizeSm]: props.size === 'sm',
                [styles.withMargin]: props.withMargin,
            }}
        >
            ▊{props.children}
        </h2>
    );
};

export const Header: ParentComponent<{ actions?: JSX.Element; padded?: boolean }> = (props) => {
    return (
        <header class={styles.header} classList={{ [styles.padded]: props.padded }}>
            {props.children}
            <Show when={props.actions}>
                <div class={styles.headerActions}>{props.actions}</div>
            </Show>
        </header>
    );
};
