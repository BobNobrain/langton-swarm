import type { UnitId } from '../types';
import { createUnitEvent, type UnitEvent } from './events';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type EnergySystemData = {
    charge: number;
    capacity: number;
    lastUpdated: number;
};

const RECHARGED_TRESHOLD = 20;

export type EnergySystemController = {
    withdraw(unitId: UnitId, amount: number): boolean;
    charge(unitId: UnitId, amount: number): void;
    getData(unitId: UnitId): EnergySystemData | null;

    readonly drained: UnitEvent<null>;
    readonly recharged: UnitEvent<null>;
};

export function createEnergySystem(opts: CreateUnitSystemCommonOptions) {
    const drained = createUnitEvent<null>();
    opts.events.push(drained);
    const recharged = createUnitEvent<null>();
    opts.events.push(recharged);

    const system = createUnitSystem<EnergySystemData, {}>(opts, {
        name: 'energy',
        initialData(config, state, unitId) {
            if (!config.battery) {
                return null;
            }

            return { charge: config.battery.capacity, capacity: config.battery.capacity, lastUpdated: 0 };
        },

        messages: {},
    });

    const controller: EnergySystemController = {
        drained,
        recharged,

        getData: system.getData,

        charge(unitId, amount) {
            const energy = system.getData(unitId);
            if (!energy || energy.charge >= energy.capacity) {
                return;
            }

            const oldCharge = energy.charge;
            energy.charge = Math.min(energy.capacity, energy.charge + amount);
            energy.lastUpdated = performance.now();

            if (oldCharge < RECHARGED_TRESHOLD && energy.charge >= RECHARGED_TRESHOLD) {
                recharged.pub({ unitId, payload: null });
            }
        },

        withdraw(unitId, amount) {
            const energy = system.getData(unitId);
            if (!energy) {
                return false;
            }

            if (energy.charge < amount) {
                return false;
            }

            energy.charge -= amount;
            if (energy.charge === 0) {
                drained.pub({ unitId, payload: null });
            }

            energy.lastUpdated = performance.now();
            return true;
        },
    };

    return { system, controller };
}
