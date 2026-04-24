import type { UnitId } from '../types';

export type UnitEventController = {
    tick(): void;
    clear(unitId: UnitId): void;
};

export type UnitEvent<Payload> = {
    pub(ev: UnitEventData<Payload>): void;
    sub(unitId: UnitId, listener: (ev: UnitEventData<Payload>) => void): void;
    unsub(unitId: UnitId, listener: (ev: UnitEventData<Payload>) => void): void;
    subToAll(listener: (ev: UnitEventData<Payload>) => void): void;
};

export type UnitEventWithArgs<Payload, Args> = {
    pub(ev: UnitEventData<Payload>): void;
    sub(unitId: UnitId, listener: (ev: UnitEventData<Payload>) => void, args: Args): void;
};

export type UnitEventData<P> = {
    unitId: UnitId;
    payload: P;
};

// when battery.below(0.2) { state :home }
// when spawned { engine.move($random) }

export function createUnitEvent<Payload>(): UnitEvent<Payload> & UnitEventController {
    const subs: {
        units: Set<UnitId>;
        handler: (ev: UnitEventData<Payload>) => void;
    }[] = [];
    const subsToAll: Array<(ev: UnitEventData<Payload>) => void> = [];
    const publishQueue: UnitEventData<Payload>[] = [];

    return {
        pub(ev) {
            publishQueue.push(ev);
        },

        sub(unitId, listener) {
            for (const sub of subs) {
                if (sub.handler === listener) {
                    sub.units.add(unitId);
                    return;
                }
            }

            subs.push({ units: new Set([unitId]), handler: listener });
        },
        unsub(unitId, listener) {
            for (let i = 0; i < subs.length; i++) {
                const sub = subs[i];

                if (sub.handler !== listener || !sub.units.has(unitId)) {
                    continue;
                }

                sub.units.delete(unitId);
                if (!sub.units.size) {
                    subs.splice(i, 1);
                }
                break;
            }
        },

        subToAll(listener) {
            subsToAll.push(listener);
        },

        clear(unitId) {
            for (const sub of subs) {
                sub.units.delete(unitId);
            }
        },

        tick() {
            for (const ev of publishQueue) {
                for (const sub of subs) {
                    if (!sub.units.has(ev.unitId)) {
                        continue;
                    }

                    sub.handler(ev);
                }

                for (const sub of subsToAll) {
                    sub(ev);
                }
            }

            publishQueue.length = 0;
        },
    };
}

export function createUnitEventWithArgs<Payload, Args>(
    shouldTrigger: (ev: UnitEventData<Payload>, args: Args) => boolean,
): UnitEventWithArgs<Payload, Args> & UnitEventController {
    const subs: {
        units: Set<UnitId>;
        args: Args;
        handler: (ev: UnitEventData<Payload>) => void;
    }[] = [];
    const publishQueue: UnitEventData<Payload>[] = [];

    return {
        pub(ev) {
            publishQueue.push(ev);
        },

        sub(unitId, listener, args) {
            for (const sub of subs) {
                if (sub.handler === listener) {
                    sub.units.add(unitId);
                    return;
                }
            }

            subs.push({ units: new Set([unitId]), handler: listener, args });
        },

        clear(unitId) {
            for (const sub of subs) {
                sub.units.delete(unitId);
            }
        },

        tick() {
            for (const ev of publishQueue) {
                for (const sub of subs) {
                    if (!sub.units.has(ev.unitId)) {
                        continue;
                    }

                    if (!shouldTrigger(ev, sub.args)) {
                        continue;
                    }

                    sub.handler(ev);
                }
            }

            publishQueue.length = 0;
        },
    };
}
