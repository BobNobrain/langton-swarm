import { dot, normz } from '@/lib/3d';
import type { GameWorld } from '../world';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import type { EnergySystemController } from './energy';

type SolarData = {
    maxOutput: number;
};

const SLEEP_TIME_TICKS = 10;

export function createSolarSystem(
    opts: CreateUnitSystemCommonOptions,
    world: GameWorld,
    battery: EnergySystemController,
) {
    const system = createUnitSystem<SolarData, {}>(opts, {
        name: 'solar',
        messages: {},

        initialData(config, state, unitId) {
            if (!config.solar) {
                return null;
            }

            return { maxOutput: config.solar.maxOutput };
        },

        tick(ctx, env) {
            const solar = ctx.systemData;
            const cos = dot(normz(world.sunPosition), normz(world.graph.getCoordsOf(ctx.state.location)));
            const frac = solar.maxOutput * cos;

            if (frac >= 0.1) {
                battery.charge(ctx.unitId, Math.ceil(frac));
            }

            ctx.sleep(SLEEP_TIME_TICKS);
        },
    });

    return system;
}
