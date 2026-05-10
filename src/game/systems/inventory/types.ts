import type { UnitId } from '@/game/types';
import type { UnitEvent } from '../events';
import type { PositionalSystemController } from '../positions';
import type { StationariesSystemController } from '../stationaries';
import type { SpawnFn } from '../types';

export type InventoryData = {
    readonly capacity: number;
    size: number;
    readonly contents: Record<string, number>;
    readonly shouldDespawnWhenEmpty: boolean;
};

export type InventoryController = {
    add(opts: { to: UnitId; amounts: Record<string, number> }): Record<string, number>;
    withdraw(opts: { from: UnitId; amounts: Record<string, number> }): boolean;
    transfer(trinfo: {
        from: UnitId;
        to: UnitId;
        amounts: Record<string, number> | null;
        strategy: 'max' | 'all';
    }): Record<string, number> | null;
    hasSpace(unitId: UnitId, space: number): boolean;
    getInfo(unitId: UnitId): InventoryData | null;
    getFreeSpace(unitId: UnitId): number;

    updated: UnitEvent<InventoryData>;
};

export type InventoryDeps = {
    stationaries: StationariesSystemController;
    inventories: InventoryController;
    positions: PositionalSystemController;
    spawn: SpawnFn;
};
