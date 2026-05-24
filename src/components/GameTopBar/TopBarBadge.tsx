import { Show, type ParentComponent } from 'solid-js';
import styles from './GameTopBar.module.css';

export const TopBarBadge: ParentComponent<{
    icon?: string;
    text?: string;
    title?: string;
    color?: string;
    padRight?: boolean;
    cls?: string;
    wrapperRef?: (el: HTMLDivElement) => void;
    onClick?: (ev: MouseEvent) => void;
}> = (props) => {
    return (
        <div
            ref={props.wrapperRef}
            class={styles.badge}
            classList={{
                [styles.padRight]: props.padRight,
                [props.cls ?? '']: Boolean(props.cls),
            }}
            title={props.title}
            style={{
                '--tbb-color': props.color,
            }}
            role={props.onClick ? 'button' : undefined}
            onClick={props.onClick}
        >
            <Show when={!props.children} fallback={props.children}>
                <span class={styles.icon}>{props.icon}</span>
                <span class={styles.text}>{props.text}</span>
            </Show>
        </div>
    );
};
