import { isPile, getStorageCapacity } from '@/game/config';
import { createUnitEvent } from '../events';
import { usfHandlers, type CallableUnitSystemMessages } from '../func';
import type { PositionalSystemController } from '../positions';
import type { StationariesSystemController } from '../stationaries';
import { createUnitSystem } from '../systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SpawnFn, UnitSystem } from '../types';
import { INVENTORY_FNS } from './fns';
import type { InventoryController, InventoryData, InventoryDeps } from './types';
import { measure, transferAsMuchAsPossible, transferEverything } from './utils';

export const INVENTORY_SYSTEM_NAME = 'storage';

export function createInventorySystem(
    options: CreateUnitSystemCommonOptions,
    stationaries: StationariesSystemController,
    positions: PositionalSystemController,
    spawn: SpawnFn,
    despawn: DespawnFn,
) {
    let system: UnitSystem<InventoryData>;

    const updated = createUnitEvent<InventoryData>();
    options.events.push(updated);

    const controller: InventoryController = {
        updated,

        add({ to, amounts }) {
            const inv = system.getData(to);
            if (!inv) {
                return {};
            }

            const effective = transferAsMuchAsPossible({ from: null, to: inv, amounts });
            if (measure(effective) !== 0) {
                system.activate(to);
                controller.updated.pub({ unitId: to, payload: inv });
            }

            return effective;
        },
        withdraw({ from, amounts }) {
            const inv = system.getData(from);
            if (!inv) {
                return false;
            }

            const ok = transferEverything({ from: inv, to: null, amounts });
            if (ok) {
                system.activate(from);
                controller.updated.pub({ unitId: from, payload: inv });
            }
            return ok;
        },

        transfer({ from, to, amounts, strategy }) {
            const invFrom = system.getData(from);
            const invTo = system.getData(to);
            if (!invFrom || !invTo) {
                return null;
            }

            if (amounts === null) {
                amounts = { ...invFrom.contents };
            }

            let result: Record<string, number> | null = null;
            switch (strategy) {
                case 'all':
                    result = transferEverything({ from: invFrom, to: invTo, amounts }) ? amounts : null;
                    break;

                case 'max':
                    result = transferAsMuchAsPossible({
                        from: invFrom,
                        to: invTo,
                        amounts,
                    });
                    break;
            }

            if (result) {
                system.activate(from);
                system.activate(to);

                controller.updated.pub({ unitId: from, payload: invFrom });
                controller.updated.pub({ unitId: to, payload: invTo });
            }

            return result;
        },

        hasSpace(unitId, space) {
            const inv = system.getData(unitId);
            if (!inv) {
                return false;
            }

            return inv.capacity - inv.size >= space;
        },

        getInfo(unitId) {
            return system.getData(unitId);
        },

        getFreeSpace(unitId) {
            const inventory = system.getData(unitId);
            if (!inventory) {
                return 0;
            }
            return inventory.capacity - inventory.size;
        },
    };

    system = createUnitSystem<InventoryData, CallableUnitSystemMessages>(options, {
        name: INVENTORY_SYSTEM_NAME,
        messages: {
            ...usfHandlers<InventoryData, InventoryDeps>(INVENTORY_FNS, {
                stationaries,
                inventories: controller,
                spawn,
                positions,
            }),
        },

        initialData: ({ config }) => {
            if (!config.storage) {
                return null;
            }

            return {
                capacity: getStorageCapacity(config),
                size: 0,
                contents: {},
                shouldDespawnWhenEmpty: isPile(config),
            };
        },

        tick(ctx) {
            if (!ctx.systemData.shouldDespawnWhenEmpty || ctx.systemData.size > 0) {
                ctx.sleep();
                return;
            }

            console.log('[DEBUG] despawning a pile:', ctx.systemData);
            despawn(ctx.unitId);
        },
    });

    return { system, controller };
}
