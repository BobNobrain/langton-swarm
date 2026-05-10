import { PILE_PRESET } from '@/game/config';
import { NO_FACTION } from '@/game/factions';
import { InventoryDelta } from '@/game/inventory';
import { typedUSF, type CallableUnitSystemFunctions } from '../func';
import type { InventoryData, InventoryDeps } from './types';
import { measure } from './utils';

export const INVENTORY_FNS: CallableUnitSystemFunctions<InventoryData, InventoryDeps> = {
    unload_all: {
        description:
            "Unloads everything in unit's inventory into storage at its location (or just drops it on the ground)",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { inventories, stationaries, spawn, positions }) {
            const inv = ctx.systemData;
            const loc = positions.getEffectivePosition(ctx.unitId);

            let target = stationaries.getAt(loc);
            if (target === ctx.unitId) {
                // a stationary object cannot dump its inventory
                return { type: 'flag', value: false };
            }

            if (!target) {
                // a pile of material on the ground
                target = spawn({ at: loc, config: PILE_PRESET, faction: NO_FACTION });
            }

            const transfered = inventories.transfer({
                from: ctx.unitId,
                to: target,
                amounts: null,
                strategy: 'all',
            });

            return { type: 'flag', value: transfered !== null };
        },
    },
    unload_max: typedUSF({
        description:
            'Unloads as much as possible, but no more than specified amount of materials, into storage at its location (or just drops it on the ground)',
        args: { items: 'inventory' },
        returnType: 'flag',
        *body(args, ctx, { positions, stationaries, spawn, inventories }) {
            const loc = positions.getEffectivePosition(ctx.unitId);

            let target = stationaries.getAt(loc);
            if (target === ctx.unitId) {
                // a stationary object cannot dump its inventory
                return { type: 'flag', value: false };
            }

            if (!target) {
                // a pile of material on the ground
                target = spawn({ at: loc, config: PILE_PRESET, faction: NO_FACTION });
            }

            const transfered = inventories.transfer({
                from: ctx.unitId,
                to: target,
                amounts: args.items.value.content,
                strategy: 'max',
            });

            return { type: 'flag', value: transfered !== null && measure(transfered) > 0 };
        },
    }),

    pickup_all: {
        description: "Picks up everything in the storage/pile at current unit's location into unit's own storage",
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx, { inventories, stationaries, positions }) {
            const loc = positions.getEffectivePosition(ctx.unitId);

            let pickupFrom = stationaries.getAt(loc);
            if (pickupFrom === ctx.unitId) {
                // a stationary object cannot pickup
                return { type: 'number', value: 0 };
            }

            if (!pickupFrom) {
                // there's no storage to pick up from
                return { type: 'number', value: 0 };
            }

            const transfered = inventories.transfer({
                from: pickupFrom,
                to: ctx.unitId,
                amounts: null,
                strategy: 'max',
            });

            return { type: 'number', value: transfered === null ? 0 : measure(transfered) };
        },
    },

    get_free_space: {
        description: "Allows to check, how much free space is left in unit's storage",
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx) {
            const inv = ctx.systemData;
            return { type: 'number', value: inv.capacity - inv.size };
        },
    },
    get_filled_share: {
        description: 'Returns how much storage is filled, on scale of 0 to 1',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx) {
            const inv = ctx.systemData;
            return { type: 'number', value: inv.size / inv.capacity };
        },
    },
    is_empty: {
        description: "Allows to check if unit's storage is empty",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx) {
            const inv = ctx.systemData;
            return { type: 'flag', value: inv.size === 0 };
        },
    },
    is_full: {
        description: "Allows to check if unit's storage is full",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx) {
            const inv = ctx.systemData;
            return { type: 'flag', value: inv.size === inv.capacity };
        },
    },

    content: {
        description: "Returns inventory content of unit's storage",
        argNames: [],
        argTypes: [],
        returnType: 'inventory',
        *body(_, ctx) {
            const inv = ctx.systemData;
            return { type: 'inventory', value: InventoryDelta.fromMany(inv.contents) };
        },
    },
};
