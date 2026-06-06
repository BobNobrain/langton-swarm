import { dot, normz } from '@/lib/3d';
import { getMaxSolarPower } from '../config';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem, type UnitSystemTickContext } from './UnitSystem';

type SolarData = {
    maxOutput: number;
};

const SLEEP_TIME_TICKS = 10;

export class SolarSystem extends UnitSystem<SolarData> {
    constructor(
        opts: UnitSystemOrchestrator,
        private world: GameWorld,
        private positions: PositionalSystemController,
        private battery: EnergySystemController,
    ) {
        super('solar', opts);
    }

    protected initialData({ config }: SpawnOptions): SolarData | null {
        if (!config.solar) {
            return null;
        }

        return { maxOutput: getMaxSolarPower(config) * SLEEP_TIME_TICKS };
    }

    protected onTick(ctx: UnitSystemTickContext<SolarData>): void {
        const solar = ctx.systemData;
        const cos = dot(
            normz(this.world.sunPosition),
            normz(this.world.graph.getCoordsOf(this.positions.getEffectivePosition(ctx.unitId))),
        );
        const frac = solar.maxOutput * cos;

        if (frac >= 0.1) {
            this.battery.charge(ctx.unitId, Math.ceil(frac));
        }

        this.sleep(ctx.unitId, SLEEP_TIME_TICKS);
    }
}
