import type { GameLoop } from '../loop';
import type { NodeId, UnitId } from '../types';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem } from './UnitSystem';

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

export class PositionalSystem extends UnitSystem<DynamicPosition> implements PositionalSystemController {
    constructor(
        opts: UnitSystemOrchestrator,
        private gameLoop: GameLoop,
    ) {
        super('positions', opts);
    }

    protected initialData({ at }: SpawnOptions): DynamicPosition | null {
        return {
            targetPosition: at,
            sourcePosition: at,
            targetTime: 0,
            sourceTime: 0,
        };
    }

    move(unitId: UnitId, to: NodeId, deltaTime: number): boolean {
        const pos = this.getData(unitId);
        if (!pos) {
            return false;
        }

        const time = this.gameLoop.getCurrentTick();
        if (time < pos.targetTime) {
            return false;
        }

        pos.sourcePosition = pos.targetPosition;
        pos.targetPosition = to;
        pos.sourceTime = time;
        pos.targetTime = time + deltaTime;
        return true;
    }

    isMoving(unitId: UnitId): boolean {
        const pos = this.getData(unitId);
        return pos ? this.gameLoop.getCurrentTick() < pos.targetTime : false;
    }

    getEffectivePosition(unitId: UnitId): NodeId {
        const pos = this.getData(unitId);
        if (!pos) {
            return -1 as NodeId;
        }

        const tick = this.gameLoop.getCurrentTick();
        if (tick >= pos.targetTime) {
            return pos.targetPosition;
        }

        return (tick - pos.sourceTime) / (pos.targetTime - pos.sourceTime) >= 0.5
            ? pos.targetPosition
            : pos.sourcePosition;
    }

    getFullPosition(unitId: UnitId): DynamicPosition | null {
        return this.getData(unitId);
    }

    findAtPosition(pos: NodeId, { strict }: { strict?: boolean } = {}): UnitId[] {
        // TODO: cache or something
        const result: UnitId[] = [];

        if (strict) {
            for (const unitId of this.activeData.keys()) {
                if (this.getEffectivePosition(unitId) === pos) {
                    result.push(unitId);
                }
            }
            return result;
        }

        const time = this.gameLoop.getCurrentTick();
        for (const [unitId, { systemData: data }] of this.activeData.entries()) {
            if (data.targetPosition === pos || (data.sourcePosition === pos && time <= data.targetTime)) {
                result.push(unitId);
            }
        }
        return result;
    }
}
