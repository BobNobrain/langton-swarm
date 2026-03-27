import type { UnitConfiguration } from './types';

export function createMotherConfig(): UnitConfiguration {
    return {
        battery: { capacity: 10_000 },
        storage: { size: 10_000 },
        navigator: false,
        mother: true,
    };
}
