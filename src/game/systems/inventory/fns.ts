import { UnitSystem } from '../UnitSystem';

export const INVENTORY_FNS = {
    unload_all: UnitSystem.declareFn({
        name: 'unload_all',
        args: {},
        returnType: 'flag',
        description:
            "Unloads everything in unit's inventory into storage at its location (or just drops it on the ground)",
    }),
    unload_max: UnitSystem.declareFn({
        name: 'unload_max',
        args: { items: 'inventory' },
        returnType: 'flag',
        description:
            'Unloads as much as possible, but no more than specified amount of materials, into storage at its location (or just drops it on the ground)',
    }),

    pickup_all: UnitSystem.declareFn({
        name: 'pickup_all',
        args: {},
        returnType: 'number',
        description: "Picks up everything in the storage/pile at current unit's location into unit's own storage",
    }),

    get_free_space: UnitSystem.declareFn({
        name: 'get_free_space',
        args: {},
        returnType: 'number',
        description: "Allows to check, how much free space is left in unit's storage",
    }),
    get_filled_share: UnitSystem.declareFn({
        name: 'get_filled_share',
        args: {},
        returnType: 'number',
        description: 'Returns how much storage is filled, on scale of 0 to 1',
    }),
    is_empty: UnitSystem.declareFn({
        name: 'is_empty',
        args: {},
        returnType: 'flag',
        description: "Allows to check if unit's storage is empty",
    }),
    is_full: UnitSystem.declareFn({
        name: 'is_full',
        args: {},
        returnType: 'flag',
        description: "Allows to check if unit's storage is full",
    }),

    content: UnitSystem.declareFn({
        name: 'content',
        args: {},
        returnType: 'inventory',
        description: "Returns inventory content of unit's storage",
    }),
} as const;
