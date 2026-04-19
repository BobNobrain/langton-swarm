import { isPile } from '@/game/config';
import type { Stationaries } from '../stationaries';
import { createUnitSystem, type UnitSystem } from '../systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SpawnFn } from '../types';
import { callableUnitSystemHandlers, type CallableUnitSystemMessages } from '../utils';
import { INVENTORY_FNS } from './fns';
import type { InventoryController, InventoryData, InventoryDeps } from './types';
import { transferAsMuchAsPossible, transferEverything } from './utils';

export const INVENTORY_SYSTEM_NAME = 'storage';

export function createInventorySystem(
    options: CreateUnitSystemCommonOptions,
    stationaries: Stationaries,
    spawn: SpawnFn,
    despawn: DespawnFn,
) {
    let system: UnitSystem<InventoryData>;

    const controller: InventoryController = {
        add({ to, amounts, tick }) {
            const inv = system.getData(to);
            if (!inv) {
                return false;
            }

            const ok = transferEverything({ from: null, to: inv, amounts, tick });
            if (ok) {
                system.activate(to);
            }
            return ok;
        },
        withdraw({ from, amounts, tick }) {
            const inv = system.getData(from);
            if (!inv) {
                return false;
            }

            const ok = transferEverything({ from: inv, to: null, amounts, tick });
            if (ok) {
                system.activate(from);
            }
            return ok;
        },

        transfer({ from, to, amounts, tick, strategy }) {
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
                    result = transferEverything({ from: invFrom, to: invTo, amounts, tick }) ? amounts : null;
                    break;

                case 'max':
                    result = transferAsMuchAsPossible({ from: invFrom, to: invTo, amounts, tick });
                    break;
            }

            if (result) {
                system.activate(from);
                system.activate(to);
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
    };

    system = createUnitSystem<InventoryData, CallableUnitSystemMessages>(options, {
        name: INVENTORY_SYSTEM_NAME,
        messages: {
            ...callableUnitSystemHandlers<InventoryData, InventoryDeps>(
                { stationaries, inventories: controller, spawn },
                INVENTORY_FNS,
            ),
        },

        initialData: (config, state) => {
            if (!config.storage) {
                return null;
            }

            return {
                capacity: config.storage.size,
                size: 0,
                contents: {},
                lastUpdated: -1,
                shouldDespawnWhenEmpty: isPile(config),
            };
        },

        tick(ctx, env) {
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
