import type { UnitConfiguration } from '../types';

type SolarConfig = NonNullable<UnitConfiguration['solar']>;

export const SOLAR_SMALL_PRESET: SolarConfig = { maxOutput: 2 };
export const SOLAR_MEDIUM_PRESET: SolarConfig = { maxOutput: 5 };
export const SOLAR_BIG_PRESET: SolarConfig = { maxOutput: 10 };
