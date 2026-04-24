import { createEffect, onCleanup } from 'solid-js';
import type { Event } from '@/lib/sparse';
import type { UnitEvent, UnitEventData } from '@/game/systems/events';
import type { UnitId } from '@/game';

export function createEventListener<L extends (...args: never[]) => unknown>(ev: Event<L>, listener: L) {
    const id = ev.on(listener);
    onCleanup(() => ev.off(id));
}

export function createUnitEventListener<P>({
    ev,
    listener,
    unitId,
}: {
    ev: UnitEvent<P>;
    listener: (ev: UnitEventData<P>) => void;
    unitId: () => UnitId | null;
}) {
    createEffect(() => {
        const uid = unitId();
        if (!uid) {
            return;
        }

        ev.sub(uid, listener);

        onCleanup(() => {
            ev.unsub(uid, listener);
        });
    });
}
