import { Show, type JSX, type ParentComponent } from 'solid-js';
import styles from '../Configurator.module.css';
import { Symbols } from '@/lib/ascii';

type WarningStyle = 'warn' | 'error' | 'info';

const cls: Record<WarningStyle, string> = {
    warn: styles.warningWarn,
    error: styles.warningError,
    info: styles.warningInfo,
};

export const UnitComponentWarning: ParentComponent<{
    actions?: JSX.Element;
    style?: WarningStyle;
}> = (props) => {
    const icon = () => {
        switch (props.style) {
            case undefined:
            case 'warn':
                return Symbols.TriangleUpOutline;

            case 'info':
                return 'i';

            case 'error':
                return Symbols.CircleWithCross;
        }
    };

    return (
        <div
            class={styles.warning}
            classList={{
                [cls[props.style ?? 'warn']]: true,
            }}
        >
            <div class={styles.warningIcon}>{icon()}</div>
            <div class={styles.warningContent}>{props.children}</div>
            <Show when={props.actions}>
                <div class={styles.warningActions}>{props.actions}</div>
            </Show>
        </div>
    );
};
