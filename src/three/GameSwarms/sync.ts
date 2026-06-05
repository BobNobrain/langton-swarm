import type { UnitId } from '@/game';
import type { DynamicPosition, PositionalSystemController } from '@/game/systems/positions';
import type { GridObjectData } from '../GridObjects/GridObjects';

export function extractUnitPosition(dpos: DynamicPosition, tick: number): Exclude<GridObjectData['location'], number> {
    return {
        from: dpos.sourcePosition,
        to: dpos.targetPosition,
        progress:
            dpos.targetTime === dpos.sourceTime
                ? 1
                : Math.min(1, (tick - dpos.sourceTime) / (dpos.targetTime - dpos.sourceTime)),
    };
}

export function syncPositions(
    positions: PositionalSystemController,
    objects: Record<string, GridObjectData>,
    tick: number,
) {
    for (const objectId of Object.keys(objects)) {
        const unitId = Number(objectId) as UnitId;
        const pos = positions.getFullPosition(unitId);

        if (!pos) {
            continue;
        }

        objects[objectId].location = extractUnitPosition(pos, tick);
    }
}
