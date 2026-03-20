import { Show, type JSX, type ParentComponent } from 'solid-js';
import styles from './List.module.css';

export const List: ParentComponent<{
    hasBorder?: boolean;
    insetH?: boolean;
    class?: string;
}> = (props) => {
    return (
        <ul
            class={props.class}
            classList={{
                [styles.list]: true,
                [styles.hasBorder]: props.hasBorder,
                [styles.insetH]: props.insetH,
            }}
        >
            {props.children}
        </ul>
    );
};

export const ListItem: ParentComponent<{
    checked?: boolean;
    onCheck?: (newValue: boolean) => void;
    right?: JSX.Element;
    class?: string;
    onClick?: () => void;
    onMainClick?: () => void;
}> = (props) => {
    return (
        <li
            class={styles.item}
            classList={{
                [props.class ?? '']: Boolean(props.class),
                [styles.clickable]: Boolean(props.onClick || props.onMainClick),
            }}
            onClick={props.onClick}
        >
            <Show when={props.checked !== undefined}>
                <label class={styles.check}>
                    <input
                        type="checkbox"
                        class={styles.checkboxInput}
                        checked={props.checked}
                        onChange={(ev) => props.onCheck?.(ev.currentTarget.checked)}
                    />
                    <Show when={props.checked} fallback="[ ]">
                        [x]
                    </Show>
                </label>
            </Show>
            <div class={styles.main} onClick={props.onMainClick}>
                {props.children}
            </div>
            <Show when={props.right}>
                <div class={styles.right}>{props.right}</div>
            </Show>
        </li>
    );
};

export const ListEmptyContent: ParentComponent<{
    title?: JSX.Element;
    actions?: JSX.Element;
}> = (props) => {
    return (
        <li class={styles.empty}>
            <Show when={props.title}>
                <h3>{props.title}</h3>
            </Show>
            <div>{props.children}</div>
            <Show when={props.actions}>
                <div>{props.actions}</div>
            </Show>
        </li>
    );
};
