import type { UnitConfiguration } from '../types';

type StorageConfig = NonNullable<UnitConfiguration['storage']>;

export const STORAGE_TINY_PRESET: StorageConfig = { size: 10 };
export const STORAGE_SMALL_PRESET: StorageConfig = { size: 25 };
export const STORAGE_MEDIUM_PRESET: StorageConfig = { size: 50 };
export const STORAGE_LARGE_PRESET: StorageConfig = { size: 100 };
export const STORAGE_WAREHOUSE_PRESET: StorageConfig = { size: 1000 };
