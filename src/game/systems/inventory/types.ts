import type { UnitId } from '@/game/types';
import type { Stationaries } from '../stationaries';
import type { SpawnFn } from '../types';

export type InventoryData = {
    readonly capacity: number;
    size: number;
    readonly contents: Record<string, number>;
    lastUpdated: number;
    readonly shouldDespawnWhenEmpty: boolean;
};

export type InventoryController = {
    add(opts: { to: UnitId; amounts: Record<string, number>; tick: number }): boolean;
    withdraw(opts: { from: UnitId; amounts: Record<string, number>; tick: number }): boolean;
    transfer(trinfo: {
        from: UnitId;
        to: UnitId;
        amounts: Record<string, number> | null;
        tick: number;
        strategy: 'max' | 'all';
    }): Record<string, number> | null;
    hasSpace(unitId: UnitId, space: number): boolean;
    getInfo(unitId: UnitId): InventoryData | null;
};

export type InventoryDeps = {
    stationaries: Stationaries;
    inventories: InventoryController;
    spawn: SpawnFn;
};
