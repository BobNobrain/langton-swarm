import type { UnitConfiguration } from './types';

export function getProcessorEnergyConsumption(config: UnitConfiguration): number {
    return 1;
}

export function getProcessorTickRate(config: UnitConfiguration): number {
    return 4; // every 4 ticks, so 5 times per second
}
