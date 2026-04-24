import { PILE_PRESET } from '@/game/config';
import { returnToCpu, type CallableUnitSystemFunctions } from '../utils';
import type { InventoryData, InventoryDeps } from './types';
import { measure } from './utils';

export const INVENTORY_FNS: CallableUnitSystemFunctions<InventoryData, InventoryDeps> = {
    unload_all: {
        description:
            "Unloads everything in unit's inventory into storage at its location (or just drops it on the ground)",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_, ctx, env, { inventories, stationaries, spawn }) {
            const inv = ctx.systemData;
            const loc = ctx.state.location;

            let target = stationaries.getAt(loc);
            if (target === ctx.unitId) {
                // a stationary object cannot dump its inventory
                returnToCpu(ctx, { type: 'flag', value: false });
                return false;
            }

            if (!target) {
                // a pile of material on the ground
                target = spawn({ at: loc, config: PILE_PRESET });
            }

            const transfered = inventories.transfer({
                from: ctx.unitId,
                to: target,
                tick: env.currentTick,
                amounts: null,
                strategy: 'all',
            });

            returnToCpu(ctx, { type: 'flag', value: transfered !== null });
            return false;
        },
    },

    pickup_all: {
        description: "Picks up everything in the storage/pile at current unit's location into unit's own storage",
        argNames: [],
        argTypes: [],
        returnType: 'number',
        init(args, ctx, env, { inventories, stationaries }) {
            const inv = ctx.systemData;
            const loc = ctx.state.location;

            let pickupFrom = stationaries.getAt(loc);
            if (pickupFrom === ctx.unitId) {
                // a stationary object cannot pickup
                returnToCpu(ctx, { type: 'number', value: 0 });
                return false;
            }

            if (!pickupFrom) {
                // there's no storage to pick up from
                returnToCpu(ctx, { type: 'number', value: 0 });
                return false;
            }

            const transfered = inventories.transfer({
                from: pickupFrom,
                to: ctx.unitId,
                tick: env.currentTick,
                amounts: null,
                strategy: 'max',
            });

            returnToCpu(ctx, { type: 'number', value: transfered === null ? 0 : measure(transfered) });
            return false;
        },
    },

    get_free_space: {
        description: "Allows to check, how much free space is left in unit's storage",
        argNames: [],
        argTypes: [],
        returnType: 'number',
        init(_, ctx) {
            const inv = ctx.systemData;
            returnToCpu(ctx, { type: 'number', value: inv.capacity - inv.size });
            return false;
        },
    },
    is_empty: {
        description: "Allows to check is unit's storage is empty",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_, ctx) {
            const inv = ctx.systemData;
            returnToCpu(ctx, { type: 'flag', value: inv.size === 0 });
            return false;
        },
    },
};
