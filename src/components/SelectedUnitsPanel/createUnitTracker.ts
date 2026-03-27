import { createSignal } from 'solid-js';
import type { NodeId, UnitId } from '@/game';
import { renderStateName } from '@/game/program/utils';
import { useGame } from '@/gameContext';
import { onTickConditional } from '@/hooks/onTick';

export type UnitTracker = {
    rStateName: () => string;
    rHealth: () => number;
    rEnergy: () => number;
    rLocation: () => NodeId | null;
};

export function createUnitTracker(unitId: () => UnitId | null): UnitTracker {
    const { units } = useGame();
    const [rStateName, rSetStateName] = createSignal(renderStateName(null));
    const [rHealth, rSetHealth] = createSignal(1);
    const [rEnergy, rSetEnergy] = createSignal(1);
    const [rLocation, rSetLocation] = createSignal<NodeId | null>(null);

    onTickConditional(unitId, (uid) => () => {
        rSetLocation(units.unitStates[uid]?.location ?? null);

        const cpu = units.cpu.getData(uid);
        rSetStateName(renderStateName(cpu?.state));
    });

    return {
        rStateName,
        rHealth,
        rEnergy,
        rLocation,
    };
}
