import { createSignal, onCleanup } from 'solid-js';

export type BoundsTracker<T extends HTMLElement> = {
    getBounds: () => DOMRect;
    getScroll: () => ScrollProperties;
    ref: (el: T) => void;
    getElement: () => T | null;
};

export type ScrollProperties = {
    scrollWidth: number;
    scrollHeight: number;
    scrollLeft: number;
    scrollTop: number;
};

export type CreateBoundsTrackerOptions = {
    /** Enables updates via periodic checks */
    useInterval?: boolean;
    /** How often to update the bounds, if `useInterval` is enabled */
    intervalMs?: number;
    /** Enables tracking on scroll events (NOT IMPLEMENTED yet) */
    trackScroll?: boolean;
};

export function createBoundsTracker<T extends HTMLElement>({
    intervalMs = 200,
    useInterval,
}: CreateBoundsTrackerOptions = {}): BoundsTracker<T> {
    let el: T | null = null;
    const [getBounds, setBounds] = createSignal<DOMRect>(new DOMRect());
    const [getScroll, setScroll] = createSignal<ScrollProperties>({
        scrollHeight: 0,
        scrollWidth: 0,
        scrollLeft: 0,
        scrollTop: 0,
    });

    const updateBounds = () => {
        if (!el) {
            return;
        }

        const newBounds = el.getBoundingClientRect();
        setBounds((oldBounds) => (eq(oldBounds, newBounds) ? oldBounds : newBounds));

        const newScroll: ScrollProperties = {
            scrollHeight: el.scrollHeight,
            scrollWidth: el.scrollWidth,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop,
        };
        setScroll((old) => {
            if (
                old.scrollHeight === newScroll.scrollHeight &&
                old.scrollWidth === newScroll.scrollWidth &&
                old.scrollTop === newScroll.scrollTop &&
                old.scrollLeft === newScroll.scrollLeft
            ) {
                return old;
            }

            return newScroll;
        });
    };

    window.addEventListener('resize', updateBounds);

    let intervalId: number | undefined;
    if (useInterval) {
        intervalId = window.setInterval(updateBounds, intervalMs);
    }

    onCleanup(() => {
        window.removeEventListener('resize', updateBounds);
        clearInterval(intervalId);
    });

    return {
        ref: (value) => {
            el = value;
            setTimeout(updateBounds, 0);
        },
        getBounds,
        getScroll,
        getElement: () => el,
    };
}

const eq = (r1: DOMRect, r2: DOMRect): boolean => {
    return (
        r1 === r2 ||
        (r1.x === r2.x &&
            r1.y === r2.y &&
            r1.width === r2.width &&
            r1.height === r2.height &&
            r1.bottom == r2.bottom &&
            r1.right === r2.right)
    );
};
