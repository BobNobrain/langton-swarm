import type { ParentComponent } from 'solid-js';
import styles from './Header.module.css';

export const Header: ParentComponent<{ size?: 'md' | 'sm' | 'lg'; withMargin?: boolean }> = (props) => {
    return (
        <h2
            class={styles.header}
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
