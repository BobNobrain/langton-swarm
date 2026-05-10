import { getEnergyPerMove, getTicksPerMove } from '../config';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import {
    usfSleep,
    usfHandlers,
    typedUSF,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './func';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

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

export const ENGINE_FNS: CallableUnitSystemFunctions<EngineData, EngineDeps> = {
    move: typedUSF({
        description: 'Commands the unit to move to a specified position (must be a neighbouring tile)',
        args: { to: 'position' },
        returnType: 'flag',
        *body(args, ctx, { world: { nav }, battery, positions }) {
            const currentPosition = positions.getEffectivePosition(ctx.unitId);
            const engine = ctx.systemData;
            const destination = args.to.value;

            const isNbor = nav.getNeighbours(currentPosition).includes(destination);
            const enoughEnergy = isNbor ? battery.withdraw(ctx.unitId, ctx.systemData.powerPerMove) : true;
            const success = enoughEnergy && isNbor;

            if (success) {
                positions.move(ctx.unitId, destination, engine.ticksPerMove);
                yield usfSleep(engine.ticksPerMove);
            }

            return { type: 'flag', value: success };
        },
    }),
};

export function createEngineSystem(options: CreateUnitSystemCommonOptions, deps: EngineDeps) {
    return createUnitSystem<EngineData, CallableUnitSystemMessages>(options, {
        name: ENGINE_SYSTEM_NAME,
        messages: {
            ...usfHandlers(ENGINE_FNS, deps),
        },

        initialData({ config }) {
            if (!config.engine) {
                return null;
            }

            return {
                ticksPerMove: getTicksPerMove(config),
                powerPerMove: getEnergyPerMove(config),
            };
        },
    });
}
