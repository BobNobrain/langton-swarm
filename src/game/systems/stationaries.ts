import { isStationary } from '../config';
import { NodeId, type UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type StationaryData = boolean; // is a valid unit

export type Stationaries = {
    getAt(location: NodeId): UnitId | null;
};

export function createStationariesSystem(
    opts: CreateUnitSystemCommonOptions,
    { despawn }: { despawn: (uid: UnitId) => void },
) {
    const stationaries = new Map<NodeId, UnitId>();

    const system = createUnitSystem<StationaryData, {}>(opts, {
        name: 'stationaries',
        initialData(config, state, unitId) {
            if (!isStationary(config)) {
                return null;
            }

            if (stationaries.has(state.location)) {
                // this location is already taken by another stationary object
                return false;
            }

            stationaries.set(state.location, unitId);
            return true;
        },
        tick(ctx, _) {
            const isValid = ctx.systemData;

            if (!isValid) {
                despawn(ctx.unitId);
            }

            ctx.sleep();
        },
        finalize(ctx, env) {
            const isValid = ctx.systemData;
            if (!isValid) {
                return;
            }

            const unitId = stationaries.get(ctx.state.location);
            if (unitId !== ctx.unitId) {
                return;
            }

            stationaries.delete(ctx.state.location);
        },
    });

    const controller: Stationaries = {
        getAt(location) {
            return stationaries.get(location) ?? null;
        },
    };

    return { system, controller };
}
