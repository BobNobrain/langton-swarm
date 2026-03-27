import { createDefaultProgramText } from './program';
import type { UnitConfiguration } from './types';

export function createDefaultUnitConfig(): UnitConfiguration {
    return {
        cpu: createDefaultProgramText(),
        battery: { capacity: 100 },
        navigator: true,
        receiver: true,
        storage: { size: 100 },
        scanner: true,
    };
}

export function getProcessorTickRate(config: UnitConfiguration): number {
    return 4; // every 4 ticks, so 5 times per second
}
