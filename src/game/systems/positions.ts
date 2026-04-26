import type { NodeId, UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

export type DynamicPosition = {
    targetPosition: NodeId;
    sourcePosition: NodeId;
    targetTime: number;
    sourceTime: number;
};

export type PositionalSystemController = {
    move(unitId: UnitId, to: NodeId, time: number): boolean;
    isMoving(unitId: UnitId): boolean;

    getEffectivePosition(unitId: UnitId): NodeId;
    getFullPosition(unitId: UnitId): DynamicPosition | null;

    findAtPosition(pos: NodeId, opts?: { strict?: boolean }): UnitId[];
};

export function createPositionalSystem(opts: CreateUnitSystemCommonOptions) {
    const system = createUnitSystem<DynamicPosition, {}>(opts, {
        name: 'positions',
        initialData({ at }) {
            return {
                targetPosition: at,
                sourcePosition: at,
                targetTime: 0,
                sourceTime: 0,
            };
        },
    });

    const controller: PositionalSystemController = {
        getFullPosition: system.getData,
        getEffectivePosition(unitId) {
            const pos = system.getData(unitId);
            if (!pos) {
                return -1 as NodeId;
            }

            const tick = opts.env.currentTick;
            if (tick >= pos.targetTime) {
                return pos.targetPosition;
            }

            return (tick - pos.sourceTime) / (pos.targetTime - pos.sourceTime) >= 0.5
                ? pos.targetPosition
                : pos.sourcePosition;
        },

        isMoving(unitId) {
            const pos = system.getData(unitId);
            return pos ? opts.env.currentTick < pos.targetTime : false;
        },

        move(unitId, to, deltaTime) {
            const pos = system.getData(unitId);
            if (!pos) {
                return false;
            }

            const time = opts.env.currentTick;
            if (time < pos.targetTime) {
                return false;
            }

            pos.sourcePosition = pos.targetPosition;
            pos.targetPosition = to;
            pos.sourceTime = time;
            pos.targetTime = time + deltaTime;
            return true;
        },

        findAtPosition(pos, { strict } = {}) {
            // TODO: cache or something
            const result: UnitId[] = [];

            if (strict) {
                for (const unitId of system.getUnitIds()) {
                    if (controller.getEffectivePosition(unitId) === pos) {
                        result.push(unitId);
                    }
                }
                return result;
            }

            for (const unitId of system.getUnitIds()) {
                const data = controller.getFullPosition(unitId)!;
                if (data.sourcePosition === pos || data.targetPosition === pos) {
                    result.push(unitId);
                }
            }
            return result;
        },
    };

    return { system, controller };
}
