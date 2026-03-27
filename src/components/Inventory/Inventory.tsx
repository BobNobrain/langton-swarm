import { For, type Component } from 'solid-js';
import styles from './Inventory.module.css';

export const Inventory: Component<{
    contents: unknown[];
}> = (props) => {
    return (
        <div class={styles.inventory}>
            <For each={props.contents} fallback={<div class={styles.empty}>Inventory empty</div>}>
                {(item) => null}
            </For>
        </div>
    );
};
