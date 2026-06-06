import { getEnergyPerMove, getTicksPerMove } from '../config';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { fnReturn, UnitSystem } from './UnitSystem';

type EngineData = {
    ticksPerMove: number;
    powerPerMove: number;
};

type EngineDeps = {
    world: Pick<GameWorld, 'nav'>;
    battery: EnergySystemController;
    positions: PositionalSystemController;
};

export const ENGINE_SYSTEM_NAME = 'engine';

export const ENGINE_FNS = {
    move: UnitSystem.declareFn({
        name: 'move',
        args: { to: 'position' },
        returnType: 'flag',
        description: 'Commands the unit to move to a specified position (must be a neighbouring tile)',
    }),
} as const;

export class EngineSystem extends UnitSystem<EngineData> {
    constructor(opts: UnitSystemOrchestrator, { battery, positions, world: { nav } }: EngineDeps) {
        super(ENGINE_SYSTEM_NAME, opts);

        this.registerFn(ENGINE_FNS.move).implement(({ args }, ctx) => {
            const currentPosition = positions.getEffectivePosition(ctx.unitId);
            const engine = ctx.systemData;
            const destination = args.to.value;

            const isNbor = nav.getNeighbours(currentPosition).includes(destination);
            const enoughEnergy = isNbor ? battery.withdraw(ctx.unitId, ctx.systemData.powerPerMove) : true;
            const success = enoughEnergy && isNbor;

            if (success) {
                positions.move(ctx.unitId, destination, engine.ticksPerMove);
            }

            return fnReturn({ type: 'flag', value: success }, success ? engine.ticksPerMove : 0);
        });
    }

    protected initialData({ config }: SpawnOptions): EngineData | null {
        if (!config.engine) {
            return null;
        }

        return {
            ticksPerMove: getTicksPerMove(config),
            powerPerMove: getEnergyPerMove(config),
        };
    }
}
