import type { UnitId } from '@/game/types';
import type { PositionalSystemController } from '../positions';
import type { StationariesSystemController } from '../stationaries';
import type { SpawnFn } from '../types';

export type InventoryData = {
    readonly capacity: number;
    size: number;
    readonly contents: Record<string, number>;
    lastUpdated: number;
    readonly shouldDespawnWhenEmpty: boolean;
};

export type InventoryController = {
    add(opts: { to: UnitId; amounts: Record<string, number>; tick: number }): Record<string, number>;
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
    stationaries: StationariesSystemController;
    inventories: InventoryController;
    positions: PositionalSystemController;
    spawn: SpawnFn;
};
