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
    selected?: boolean;
    right?: JSX.Element;
    bottom?: JSX.Element;
    class?: string;
    onClick?: (ev: MouseEvent) => void;
    onMainClick?: () => void;
    rightClickable?: boolean;
}> = (props) => {
    const content = () => {
        return (
            <>
                <div class={styles.main} onClick={props.onMainClick}>
                    {props.children}
                </div>
                <Show when={props.right}>
                    <div class={styles.right} onClick={props.rightClickable ? (ev) => ev.stopPropagation() : undefined}>
                        {props.right}
                    </div>
                </Show>
            </>
        );
    };

    return (
        <li
            class={styles.item}
            classList={{
                [props.class ?? '']: Boolean(props.class),
                [styles.clickable]: Boolean(props.onClick || props.onMainClick),
                [styles.selected]: props.selected,
                [styles.twoLined]: Boolean(props.bottom),
            }}
            onClick={props.onClick}
        >
            <Show when={props.bottom} fallback={content()}>
                <div class={styles.top}>{content()}</div>
                <div class={styles.bottom}>{props.bottom}</div>
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
