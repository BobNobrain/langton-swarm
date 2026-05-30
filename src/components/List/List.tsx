import { Show, type JSX, type ParentComponent } from 'solid-js';
import styles from './List.module.css';
import { KeyCode } from '@/lib/input';

export const List: ParentComponent<{
    hasBorder?: boolean;
    hasBackground?: boolean;
    insetH?: boolean;
    class?: string;
}> = (props) => {
    return (
        <ul
            class={props.class}
            classList={{
                [styles.list]: true,
                [styles.hasBorder]: props.hasBorder,
                [styles.hasBackground]: props.hasBackground,
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
    ellipsis?: boolean;
    class?: string;
    onClick?: (ev: MouseEvent | KeyboardEvent) => void;
    onMainClick?: () => void;
    rightClickable?: boolean;
}> = (props) => {
    const content = () => {
        return (
            <>
                <div
                    class={styles.main}
                    classList={{
                        [styles.ellipsis]: props.ellipsis,
                    }}
                    onClick={props.onMainClick}
                >
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
            role={props.onClick ? 'button' : undefined}
            tabIndex={props.onClick ? 0 : undefined}
            onClick={props.onClick}
            onKeyDown={(ev) => {
                if (!props.onClick) {
                    return;
                }

                if (ev.code === KeyCode.Enter || ev.code === KeyCode.Space) {
                    props.onClick(ev);
                }
            }}
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
