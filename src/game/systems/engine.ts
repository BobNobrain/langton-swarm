import { pick } from '@/lib/random';
import { getEnergyPerMove, getTicksPerMove } from '../config';
import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    callableUnitSystemHandlers,
    createScheduler,
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

type EngineDeps = { world: Pick<GameWorld, 'nav'>; battery: EnergySystemController };

export const ENGINE_SYSTEM_NAME = 'engine';
const schedule = createScheduler<EngineData>(ENGINE_SYSTEM_NAME);

export const ENGINE_FNS: CallableUnitSystemFunctions<EngineData, EngineDeps> = {
    move: {
        description: 'Commands the unit to move to a specified position (must be a neighbouring tile)',
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { world: { nav }, battery }) {
            const currentPosition = ctx.state.location;
            const to = extractTyped(args, 'to', 'position', {
                zero: { type: 'position', value: currentPosition },
                random: {
                    type: 'position',
                    value: pick(Math.random, nav.getNeighbours(currentPosition) as NodeId[]),
                },
            })!;

            const engine = ctx.systemData;
            const destination = to.value;

            schedule(
                ctx,
                (ctx, env) => {
                    const isNbor = nav.getNeighbours(ctx.state.location).includes(destination);
                    const enoughEnergy = isNbor ? battery.withdraw(ctx.unitId, ctx.systemData.powerPerMove) : true;

                    const success = enoughEnergy && isNbor;
                    returnToCpu(ctx, { type: 'flag', value: success });

                    if (success) {
                        ctx.update({ location: destination });
                    }
                },
                engine.ticksPerMove,
            );
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

        initialData(config, state) {
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
