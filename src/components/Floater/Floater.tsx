import { createMemo, onCleanup, onMount, type JSX, type ParentProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { type BoundsTracker } from '@/lib/BoundsTracker';
import styles from './Floater.module.css';

export type FloaterProps<El extends HTMLElement> = ParentProps<{
    target: BoundsTracker<El>;

    horizontalAnchor?: 'left' | 'right';
    horizontalDirection?: 'left' | 'right';
    verticalAnchor?: 'top' | 'bottom';
    verticalDirection?: 'up' | 'down';

    offsetY?: number;
    offsetX?: number;
    useTargetWidth?: boolean;
    useTargetHeight?: boolean;

    usePortal?: boolean;
    onClickOutside?: (ev: MouseEvent) => void;
}>;

export function Floater<El extends HTMLElement>(props: FloaterProps<El>): JSX.Element {
    const floaterStyles = createMemo(() => {
        const bounds = props.target.getBounds();
        const {
            horizontalAnchor = 'left',
            horizontalDirection = 'right',
            verticalAnchor = 'bottom',
            verticalDirection = 'down',
            offsetX = 0,
            offsetY = 0,
            useTargetHeight,
            useTargetWidth,
        } = props;

        const result: JSX.CSSProperties = {};

        if (horizontalDirection === 'left') {
            let anchorRight =
                document.body.getBoundingClientRect().width -
                (horizontalAnchor === 'left' ? bounds.left : bounds.right);

            anchorRight += offsetX;
            result.right = anchorRight + 'px';
        } else {
            const anchorLeft = (horizontalAnchor === 'left' ? bounds.left : bounds.right) + offsetX;
            result.left = anchorLeft + 'px';
        }

        if (verticalDirection === 'up') {
            let anchorBottom =
                document.body.getBoundingClientRect().height - (verticalAnchor === 'top' ? bounds.top : bounds.bottom);
            anchorBottom += offsetY;
            result.bottom = anchorBottom + 'px';
        } else {
            const anchorTop = (verticalAnchor === 'top' ? bounds.top : bounds.bottom) + offsetY;
            result.top = anchorTop + 'px';
        }

        if (useTargetWidth) {
            result['min-width'] = bounds.width + 'px';
        }
        if (useTargetHeight) {
            result['min-height'] = bounds.height + 'px';
        }

        if (verticalDirection === 'up') {
            result['align-items'] = 'flex-end';
        }
        if (horizontalDirection === 'left') {
            result['justify-content'] = 'flex-end';
        }

        return result;
    });

    const handleClick = (ev: MouseEvent) => {
        const handler = props.onClickOutside;
        if (!handler) {
            return;
        }

        const target = props.target.getBounds();
        if (
            target.left <= ev.screenX &&
            ev.screenX <= target.right &&
            target.top <= ev.screenY &&
            ev.screenY <= target.bottom
        ) {
            return;
        }

        handler(ev);
    };

    onMount(() => {
        document.addEventListener('click', handleClick);
        onCleanup(() => document.removeEventListener('click', handleClick));
    });

    return (
        <>
            {(() => {
                const children = (
                    <div
                        class={styles.floater}
                        classList={{
                            [styles.useTargetWidth]: props.useTargetWidth,
                            [styles.useTargetHeight]: props.useTargetHeight,
                        }}
                        style={floaterStyles()}
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        {props.children}
                    </div>
                );

                return props.usePortal ? <Portal>{children}</Portal> : children;
            })()}
        </>
    );
}
