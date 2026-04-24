export {
    AUTO_MINER_PRESET,
    DEFAULT_SCOUT_PRESET,
    MOTHER_PRESET,
    PILE_PRESET,
    TEST_PRESET,
    createDefaultUnitConfig,
} from './presets';
export type { UnitConfiguration } from './types';
export { getConstructionCosts, getConstructionTime, getUnitMass } from './characteristics';
export * from './utils';

export { AssemblerConfiguration, ASSEMBLER_CHARACTERISTICS, getAssemblerSpeed } from './assembler';
export { BatteryConfiguration, BATTERY_CHARACTERISTICS, getBatteryCapacity } from './battery';
export { getProcessorTickRate, getProcessorEnergyConsumption } from './cpu';
export { DrillConfiguration, DRILL_CHARACTERISTICS, getDrillProperties } from './drill';
export { EngineConfiguration, ENGINE_CHARACTERISTICS, getEnergyPerMove } from './engine';
export { SolarConfiguration, SOLAR_CHARACTERISTICS, getMaxSolarPower } from './solar';
export { StorageConfiguration, STORAGE_CHARACTERISTICS, getStorageCapacity } from './storage';
