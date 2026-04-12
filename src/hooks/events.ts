import { onCleanup } from 'solid-js';
import type { Event } from '@/lib/sparse';

export function createEventListener<L extends (...args: never[]) => unknown>(ev: Event<L>, listener: L) {
    const id = ev.on(listener);
    onCleanup(() => ev.off(id));
}
