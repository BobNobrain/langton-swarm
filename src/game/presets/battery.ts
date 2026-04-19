import type { UnitConfiguration } from '../types';

type BatteryConfig = NonNullable<UnitConfiguration['battery']>;

export const BATTERY_SMALL_PRESET: BatteryConfig = { capacity: 5000 };
export const BATTERY_MEDIUM_PRESET: BatteryConfig = { capacity: 10000 };
export const BATTERY_LARGE_PRESET: BatteryConfig = { capacity: 20000 };
export const BATTERY_GIANT_PRESET: BatteryConfig = { capacity: 50000 };
