import { isPile, getStorageCapacity, PILE_PRESET } from '@/game/config';
import { NO_FACTION } from '@/game/factions';
import { InventoryDelta } from '@/game/inventory';
import type { NodeId, UnitId } from '@/game/types';
import { createUnitEvent, type UnitEvent } from '../events';
import type { PositionalSystemController } from '../positions';
import type { StationariesSystemController } from '../stationaries';
import type { UnitSystemOrchestrator, SpawnOptions } from '../types';
import { fnReturn, UnitSystem, type UnitSystemTickContext } from '../UnitSystem';
import { INVENTORY_FNS } from './fns';
import type { InventoryController, InventoryData } from './types';
import { measure, transferAsMuchAsPossible, transferEverything } from './utils';

export const INVENTORY_SYSTEM_NAME = 'storage';

export class InventorySystem extends UnitSystem<InventoryData> implements InventoryController {
    readonly updated: UnitEvent<InventoryData>;

    constructor(
        opts: UnitSystemOrchestrator,
        stationaries: StationariesSystemController,
        positions: PositionalSystemController,
    ) {
        super(INVENTORY_SYSTEM_NAME, opts);

        this.registerEvent((this.updated = createUnitEvent()));

        this.registerFn(INVENTORY_FNS.unload_all).implement((_, ctx) => {
            const loc = positions.getEffectivePosition(ctx.unitId);

            let target = stationaries.getAt(loc);
            if (target === ctx.unitId) {
                // a stationary object cannot dump its inventory
                return fnReturn({ type: 'flag', value: false });
            }

            if (!target) {
                // a pile of material on the ground
                target = this.spawnPile(loc);
            }

            const transfered = this.transfer({
                from: ctx.unitId,
                to: target,
                amounts: null,
                strategy: 'all',
            });

            return fnReturn({ type: 'flag', value: transfered !== null });
        });

        this.registerFn(INVENTORY_FNS.unload_max).implement(({ args }, ctx) => {
            const loc = positions.getEffectivePosition(ctx.unitId);

            let target = stationaries.getAt(loc);
            if (target === ctx.unitId) {
                // a stationary object cannot dump its inventory
                return fnReturn({ type: 'flag', value: false });
            }

            if (!target) {
                // a pile of material on the ground
                target = this.spawnPile(loc);
            }

            const transfered = this.transfer({
                from: ctx.unitId,
                to: target,
                amounts: args.items.value.content,
                strategy: 'max',
            });

            return fnReturn({ type: 'flag', value: transfered !== null && measure(transfered) > 0 });
        });

        this.registerFn(INVENTORY_FNS.pickup_all).implement((_, ctx) => {
            const loc = positions.getEffectivePosition(ctx.unitId);

            let pickupFrom = stationaries.getAt(loc);
            if (pickupFrom === ctx.unitId) {
                // a stationary object cannot pickup
                return fnReturn({ type: 'number', value: 0 });
            }

            if (!pickupFrom) {
                // there's no storage to pick up from
                return fnReturn({ type: 'number', value: 0 });
            }

            const transfered = this.transfer({
                from: pickupFrom,
                to: ctx.unitId,
                amounts: null,
                strategy: 'max',
            });

            return fnReturn({ type: 'number', value: transfered === null ? 0 : measure(transfered) });
        });

        this.registerFn(INVENTORY_FNS.get_free_space).implement((_, ctx) => {
            const inv = ctx.systemData;
            return fnReturn({ type: 'number', value: inv.capacity - inv.size });
        });

        this.registerFn(INVENTORY_FNS.get_filled_share).implement((_, ctx) => {
            const inv = ctx.systemData;
            return fnReturn({ type: 'number', value: inv.size / inv.capacity });
        });

        this.registerFn(INVENTORY_FNS.is_empty).implement((_, ctx) => {
            const inv = ctx.systemData;
            return fnReturn({ type: 'flag', value: inv.size === 0 });
        });

        this.registerFn(INVENTORY_FNS.is_full).implement((_, ctx) => {
            const inv = ctx.systemData;
            return fnReturn({ type: 'flag', value: inv.size === inv.capacity });
        });

        this.registerFn(INVENTORY_FNS.content).implement((_, ctx) => {
            const inv = ctx.systemData;
            return fnReturn({ type: 'inventory', value: InventoryDelta.fromMany(inv.contents) });
        });
    }

    add({ to, amounts }: { to: UnitId; amounts: Record<string, number> }): Record<string, number> {
        const inv = this.getData(to);
        if (!inv) {
            return {};
        }

        const effective = transferAsMuchAsPossible({ from: null, to: inv, amounts });
        if (measure(effective) !== 0) {
            this.activate(to);
            this.updated.pub({ unitId: to, payload: inv });
        }

        return effective;
    }

    withdraw({ from, amounts }: { from: UnitId; amounts: Record<string, number> }): boolean {
        const inv = this.getData(from);
        if (!inv) {
            return false;
        }

        const ok = transferEverything({ from: inv, to: null, amounts });
        if (ok) {
            this.activate(from);
            this.updated.pub({ unitId: from, payload: inv });
        }
        return ok;
    }

    transfer({
        from,
        to,
        amounts,
        strategy,
    }: {
        from: UnitId;
        to: UnitId;
        amounts: Record<string, number> | null;
        strategy: 'max' | 'all';
    }): Record<string, number> | null {
        const invFrom = this.getData(from);
        const invTo = this.getData(to);
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
            this.activate(from);
            this.activate(to);

            this.updated.pub({ unitId: from, payload: invFrom });
            this.updated.pub({ unitId: to, payload: invTo });
        }

        return result;
    }

    hasSpace(unitId: UnitId, space: number): boolean {
        const inv = this.getData(unitId);
        if (!inv) {
            return false;
        }

        return inv.capacity - inv.size >= space;
    }
    /** @deprecated */
    getInfo(unitId: UnitId): InventoryData | null {
        return this.getData(unitId);
    }

    getFreeSpace(unitId: UnitId): number {
        const inventory = this.getData(unitId);
        if (!inventory) {
            return 0;
        }
        return inventory.capacity - inventory.size;
    }

    protected initialData({ config }: SpawnOptions): InventoryData | null {
        if (!config.storage) {
            return null;
        }

        return {
            capacity: getStorageCapacity(config),
            size: 0,
            contents: {},
            shouldDespawnWhenEmpty: isPile(config),
        };
    }

    protected onTick(ctx: UnitSystemTickContext<InventoryData>): void {
        if (!ctx.systemData.shouldDespawnWhenEmpty || ctx.systemData.size > 0) {
            this.sleep(ctx.unitId);
            return;
        }

        console.log('[DEBUG] despawning a pile:', ctx.systemData);
        this.orchestrator.despawn(ctx.unitId);
    }

    private spawnPile(at: NodeId): UnitId {
        return this.orchestrator.spawn({ at, config: PILE_PRESET, faction: NO_FACTION, blueprint: null });
    }
}
