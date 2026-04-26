import { isStationary } from '../config';
import { NodeId, type UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import { createScheduler } from './utils';

type StationaryData = NodeId; // position
const STATIONARIES_SYSTEM_NAME = 'stationaries';

export type StationariesSystemController = {
    getAt(location: NodeId): UnitId | null;
};

const schedule = createScheduler<StationaryData>(STATIONARIES_SYSTEM_NAME);

export function createStationariesSystem(
    opts: CreateUnitSystemCommonOptions,
    { despawn }: { despawn: (uid: UnitId) => void },
) {
    const stationaries = new Map<NodeId, UnitId>();

    const system = createUnitSystem<StationaryData, {}>(opts, {
        name: STATIONARIES_SYSTEM_NAME,
        initialData({ config, at }, unitId) {
            if (!isStationary(config)) {
                return null;
            }

            if (stationaries.has(at)) {
                // this location is already taken by another stationary object
                schedule(
                    { unitId, sendMessage: opts.sendMessage },
                    (ctx) => {
                        despawn(ctx.unitId);
                    },
                    0,
                );
                return null;
            }

            stationaries.set(at, unitId);
            return at;
        },

        finalize(ctx, env) {
            const isValid = ctx.systemData;
            if (!isValid) {
                return;
            }

            const position = ctx.systemData;

            const unitId = stationaries.get(position);
            if (unitId !== ctx.unitId) {
                return;
            }

            stationaries.delete(position);
        },
    });

    const controller: StationariesSystemController = {
        getAt(location) {
            return stationaries.get(location) ?? null;
        },
    };

    return { system, controller };
}
