import { getBatteryCapacity } from '../config';
import type { UnitId } from '../types';
import { createUnitEvent, type UnitEvent } from './events';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem } from './UnitSystem';

type EnergySystemData = {
    charge: number;
    capacity: number;
    lastUpdated: number;
};

const RECHARGED_TRESHOLD = 20;
const BATTERY_LOW_TRESHOLD = 0.1;

export type EnergySystemController = {
    withdraw(unitId: UnitId, amount: number): boolean;
    charge(unitId: UnitId, amount: number): void;
    getData(unitId: UnitId): EnergySystemData | null;

    readonly drained: UnitEvent<null>;
    readonly recharged: UnitEvent<null>;
    readonly low: UnitEvent<EnergySystemData>;
};

export class EnergySystem extends UnitSystem<EnergySystemData> implements EnergySystemController {
    public readonly drained: UnitEvent<null>;
    public readonly recharged: UnitEvent<null>;
    public readonly low: UnitEvent<EnergySystemData>;

    constructor(opts: UnitSystemOrchestrator) {
        super('energy', opts);

        this.registerEvent((this.drained = createUnitEvent()));
        this.registerEvent((this.recharged = createUnitEvent()));
        this.registerEvent((this.low = createUnitEvent()));
    }

    withdraw(unitId: UnitId, amount: number): boolean {
        const energy = this.getData(unitId);
        if (!energy) {
            return false;
        }

        if (energy.charge < amount) {
            return false;
        }

        energy.charge -= amount;
        if (energy.charge === 0) {
            this.drained.pub({ unitId, payload: null });
        } else if (energy.charge / energy.capacity < 0.1) {
            this.low.pub({ unitId, payload: energy });
        }

        energy.lastUpdated = performance.now();
        return true;
    }

    charge(unitId: UnitId, amount: number): void {
        const energy = this.getData(unitId);
        if (!energy || energy.charge >= energy.capacity) {
            return;
        }

        const oldCharge = energy.charge;
        energy.charge = Math.min(energy.capacity, energy.charge + amount);
        energy.lastUpdated = performance.now();

        if (oldCharge < RECHARGED_TRESHOLD && energy.charge >= RECHARGED_TRESHOLD) {
            this.recharged.pub({ unitId, payload: null });
        }
    }

    protected initialData({ config }: SpawnOptions): EnergySystemData | null {
        if (!config.battery) {
            return null;
        }

        const capacity = getBatteryCapacity(config);

        return { charge: capacity, capacity, lastUpdated: 0 };
    }
}
