import { isStationary } from '../config';
import { NodeId, type UnitId } from '../types';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem, type UnitSystemTickContext } from './UnitSystem';

type StationaryData = NodeId; // position
const STATIONARIES_SYSTEM_NAME = 'stationaries';
const LOCATION_TAKEN_EVENT = 'locTaken';

export type StationariesSystemController = {
    getAt(location: NodeId): UnitId | null;
    isStationary(unitId: UnitId): boolean;
};

type SaveData = {
    v: 1;
    byLoc: Map<NodeId, UnitId>;
};

export class StationariesSystem extends UnitSystem<StationaryData, SaveData> implements StationariesSystemController {
    private byLocation = new Map<NodeId, UnitId>();

    constructor(opts: UnitSystemOrchestrator) {
        super(STATIONARIES_SYSTEM_NAME, opts);

        if (this.loadedState) {
            this.byLocation = this.loadedState.byLoc;
        }

        this.registerMessageHandler(LOCATION_TAKEN_EVENT, (_, ctx) => {
            this.orchestrator.despawn(ctx.unitId);
        });
    }

    getAt(location: NodeId): UnitId | null {
        return this.byLocation.get(location) ?? null;
    }
    isStationary(unitId: UnitId): boolean {
        return this.getData(unitId) !== null;
    }

    protected onSave(): SaveData {
        return { v: 1, byLoc: this.byLocation };
    }

    protected initialData({ config, at }: SpawnOptions, unitId: UnitId): NodeId | null {
        if (!isStationary(config)) {
            return null;
        }

        if (this.byLocation.has(at)) {
            // this location is already taken by another stationary object
            this.sendMessage(STATIONARIES_SYSTEM_NAME, { event: LOCATION_TAKEN_EVENT, payload: null, unitId }, 0);
            return null;
        }

        this.byLocation.set(at, unitId);
        return at;
    }
    protected onFinalize(ctx: UnitSystemTickContext<NodeId>): void {
        const isValid = ctx.systemData;
        if (!isValid) {
            return;
        }

        const position = ctx.systemData;

        const unitId = this.byLocation.get(position);
        if (unitId !== ctx.unitId) {
            return;
        }

        this.byLocation.delete(position);
    }
}
