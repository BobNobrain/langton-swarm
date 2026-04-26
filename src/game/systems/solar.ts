import { dot, normz } from '@/lib/3d';
import { getMaxSolarPower } from '../config';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type SolarData = {
    maxOutput: number;
};

const SLEEP_TIME_TICKS = 10;

export function createSolarSystem(
    opts: CreateUnitSystemCommonOptions,
    world: GameWorld,
    positions: PositionalSystemController,
    battery: EnergySystemController,
) {
    const system = createUnitSystem<SolarData, {}>(opts, {
        name: 'solar',

        initialData({ config }) {
            if (!config.solar) {
                return null;
            }

            return { maxOutput: getMaxSolarPower(config) * SLEEP_TIME_TICKS };
        },

        tick(ctx, env) {
            const solar = ctx.systemData;
            const cos = dot(
                normz(world.sunPosition),
                normz(world.graph.getCoordsOf(positions.getEffectivePosition(ctx.unitId))),
            );
            const frac = solar.maxOutput * cos;

            if (frac >= 0.1) {
                battery.charge(ctx.unitId, Math.ceil(frac));
            }

            ctx.sleep(SLEEP_TIME_TICKS);
        },
    });

    return system;
}
