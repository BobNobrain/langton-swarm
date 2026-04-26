import { pick } from '@/lib/random';
import { getEnergyPerMove, getTicksPerMove } from '../config';
import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    callableUnitSystemHandlers,
    returnToCpu,
    schedulerMessageHandlers,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
    type UnitSystemScheduleMessages,
} from './utils';

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
    move: {
        description: 'Commands the unit to move to a specified position (must be a neighbouring tile)',
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { world: { nav }, battery, positions }) {
            const currentPosition = positions.getEffectivePosition(ctx.unitId);

            const to = extractTyped(args, 'to', 'position', {
                zero: { type: 'position', value: currentPosition },
                random: {
                    type: 'position',
                    value: pick(Math.random, nav.getNeighbours(currentPosition) as NodeId[]),
                },
            })!;

            const engine = ctx.systemData;
            const destination = to.value;

            const isNbor = nav.getNeighbours(currentPosition).includes(destination);
            const enoughEnergy = isNbor ? battery.withdraw(ctx.unitId, ctx.systemData.powerPerMove) : true;
            const success = enoughEnergy && isNbor;

            returnToCpu(ctx, { type: 'flag', value: success }, success ? engine.ticksPerMove : undefined);

            if (success) {
                positions.move(ctx.unitId, destination, engine.ticksPerMove);
            }

            return false;
        },
    },
};

export function createEngineSystem(options: CreateUnitSystemCommonOptions, deps: EngineDeps) {
    return createUnitSystem<EngineData, CallableUnitSystemMessages & UnitSystemScheduleMessages<EngineData>>(options, {
        name: ENGINE_SYSTEM_NAME,
        messages: {
            ...callableUnitSystemHandlers(deps, ENGINE_FNS),
            ...schedulerMessageHandlers(),
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
