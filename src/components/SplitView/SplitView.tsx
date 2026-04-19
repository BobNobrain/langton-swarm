import { createMemo, createSignal, Show, type Component, type JSX } from 'solid-js';
import { createDragTracker } from '@/lib/drag';
import { MouseButton } from '@/lib/input';
import styles from './SplitView.module.css';

export const SplitView: Component<{
    top: JSX.Element;
    bottom: JSX.Element;
    initialTopHeight?: number;
}> = (props) => {
    let wrapper!: HTMLDivElement;

    const [height, setHeight] = createSignal(props.initialTopHeight ?? 0.5);
    let dragStartHeight = 0;

    const { handlers } = createDragTracker({
        button: MouseButton.Left,
        onStart(ev) {
            dragStartHeight = height();
        },
        onDrag(ev) {
            const wrapperHeight = wrapper.getBoundingClientRect().height;
            const deltaHeightShare = ev.total.y / (wrapperHeight - 16);
            const newHeight = Math.max(0, Math.min(dragStartHeight + deltaHeightShare, 1));
            setHeight(newHeight);

            window.dispatchEvent(new Event('resize'));
        },
    });

    const sizes = createMemo(() => {
        if (!props.bottom || !props.top) {
            return {
                topHeight: '100%',
                bottomHeight: '100%',
            };
        }

        const h = height();
        const p = h * 100;

        return {
            topHeight: `calc(${p.toFixed(2)}% - 8px)`,
            bottomHeight: `calc(${(100 - p).toFixed(2)}% - 8px)`,
        };
    });

    return (
        <div class={styles.wrapper} ref={wrapper}>
            <Show when={props.top}>
                <section
                    class={styles.section}
                    style={{
                        height: sizes().topHeight,
                    }}
                >
                    {props.top}
                </section>
            </Show>
            <Show when={props.bottom && props.top}>
                <div class={styles.handle} {...handlers}>
                    :::
                </div>
            </Show>
            <Show when={props.bottom}>
                <section
                    class={styles.section}
                    style={{
                        height: sizes().bottomHeight,
                    }}
                >
                    {props.bottom}
                </section>
            </Show>
        </div>
    );
};
