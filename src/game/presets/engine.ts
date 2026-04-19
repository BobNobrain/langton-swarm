import type { UnitConfiguration } from '../types';

type EngineConfig = NonNullable<UnitConfiguration['engine']>;

export const ENGINE_SIMPLE_PRESET: EngineConfig = { power: 1 };
export const ENGINE_ADVANCED_PRESET: EngineConfig = { power: 2 };
export const ENGINE_EXTREME_PRESET: EngineConfig = { power: 3 };
