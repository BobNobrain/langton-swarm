import { isPile, getStorageCapacity } from '@/game/config';
import type { PositionalSystemController } from '../positions';
import type { StationariesSystemController } from '../stationaries';
import { createUnitSystem } from '../systems';
import type { CreateUnitSystemCommonOptions, DespawnFn, SpawnFn, UnitSystem } from '../types';
import { callableUnitSystemHandlers, type CallableUnitSystemMessages } from '../utils';
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

    const controller: InventoryController = {
        add({ to, amounts, tick }) {
            const inv = system.getData(to);
            if (!inv) {
                return {};
            }

            const effective = transferAsMuchAsPossible({ from: null, to: inv, amounts, tick });
            if (measure(effective) !== 0) {
                system.activate(to);
            }

            return effective;
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
                { stationaries, inventories: controller, spawn, positions },
                INVENTORY_FNS,
            ),
        },

        initialData: ({ config }) => {
            if (!config.storage) {
                return null;
            }

            return {
                capacity: getStorageCapacity(config),
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
