import type { JSX, ParentComponent } from 'solid-js';
import styles from './DefList.module.css';

export const DefList: ParentComponent = (props) => {
    return <ul class={styles.dd}>{props.children}</ul>;
};

export const DefListItem: ParentComponent<{ name: JSX.Element }> = (props) => {
    return (
        <li class={styles.ddItem}>
            <div class={styles.ddKey}>{props.name}</div>
            <div class={styles.ddValue}>{props.children}</div>
        </li>
    );
};
