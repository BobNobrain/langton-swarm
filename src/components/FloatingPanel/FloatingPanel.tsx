import type { ParentComponent } from 'solid-js';
import styles from './FloatingPanel.module.css';

export const FloatingPanel: ParentComponent<{
    pinLeft?: boolean;
    pinRight?: boolean;
    pinTop?: boolean;
    pinBottom?: boolean;
    withMargin?: boolean;
    expandedWidth?: boolean;
}> = (props) => {
    return (
        <aside
            classList={{
                [styles.panel]: true,
                [styles.expanded]: props.expandedWidth,
                [styles.pinLeft]: props.pinLeft,
                [styles.pinRight]: props.pinRight,
                [styles.pinBottom]: props.pinBottom,
                [styles.pinTop]: props.pinTop,
                [styles.withMargin]: props.withMargin,
                [styles.withMaxHeight]: !props.pinBottom || !props.pinTop,
            }}
        >
            {props.children}
        </aside>
    );
};

export const FloatingPanelHeader: ParentComponent<{
    sticky?: boolean;
}> = (props) => {
    return (
        <header
            class={styles.header}
            classList={{
                [styles.sticky]: props.sticky,
            }}
        >
            {props.children}
        </header>
    );
};

export const FloatingPanelOverlay: ParentComponent<{
    visible: boolean;
}> = (props) => {
    return (
        <div
            class={styles.overlay}
            classList={{
                [styles.overlayVisible]: props.visible,
            }}
        >
            <div class={styles.overlayContent}>{props.children}</div>
        </div>
    );
};
