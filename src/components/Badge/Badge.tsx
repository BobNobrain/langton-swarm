import { Show, type JSX, type ParentComponent } from 'solid-js';
import styles from './Badge.module.css';

type BadgeStyle = 'outline' | 'solid';

const cls: Record<BadgeStyle, string> = {
    outline: styles.outline,
    solid: styles.solid,
};

export const Badge: ParentComponent<{
    icon?: JSX.Element;
    class?: string;
    block?: boolean;
    style?: BadgeStyle;
}> = (props) => {
    return (
        <span
            class={styles.badge}
            classList={{
                [props.class ?? '']: Boolean(props.class),
                [styles.block]: props.block,
                [cls[props.style ?? 'outline']]: true,
            }}
        >
            <Show when={props.icon}>
                <span class={styles.icon}>{props.icon}</span>
            </Show>
            {props.children}
        </span>
    );
};
