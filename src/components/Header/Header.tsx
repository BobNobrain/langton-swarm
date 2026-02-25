import type { ParentComponent } from 'solid-js';
import styles from './Header.module.css';

export const Header: ParentComponent = (props) => {
    return <h2 class={styles.header}>▊{props.children}</h2>;
};
