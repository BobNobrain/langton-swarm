import type { KnownResourceName } from '../worldgen/resources';
import type { AssemblerConfiguration } from './assembler';
import type { BatteryConfiguration } from './battery';
import type { DrillConfiguration } from './drill';
import type { EngineConfiguration } from './engine';
import type { SolarConfiguration } from './solar';
import type { StorageConfiguration } from './storage';

export type UnitConfiguration = {
    /** BSML program for unit's CPU */
    cpu?: string;
    /** Unit's movement characteristics */
    engine?: EngineConfiguration;
    /** If unit has navigation & movement capabilities */
    navigator?: boolean;
    /** If unit has a scanner to scan for ores */
    drill?: DrillConfiguration;
    /** If unit has a mineral scanner */
    scanner?: boolean;
    /** Unit storage characteristics */
    storage?: StorageConfiguration;
    /** Unit battery characteristics */
    battery?: BatteryConfiguration;
    /** Construction target (for stationaries) */
    construction?: UnitConfiguration;
    /** Solar panels */
    solar?: SolarConfiguration;
    /** Assembler block */
    assembler?: AssemblerConfiguration;
};

export type ConstructionCosts = { [key in KnownResourceName]?: number };

export type ConfigSpecific<T> = {
    [key in keyof UnitConfiguration]-?:
        | { value: T }
        | (NonNullable<UnitConfiguration[key]> extends PropertyKey
              ? Record<NonNullable<UnitConfiguration[key]>, T>
              : never)
        | ((value: NonNullable<UnitConfiguration[key]>) => T);
};

export type CommonCharacteristics = {
    mass: number;
    constructionTime: number;
    constructionCosts: ConstructionCosts;
};
