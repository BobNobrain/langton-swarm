import { pick } from '@/lib/random';
import { getTicksPerMove } from '../config';
import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
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
};

type EngineDeps = Pick<GameWorld, 'nav'>;

export const ENGINE_SYSTEM_NAME = 'engine';
const schedule = createScheduler(ENGINE_SYSTEM_NAME);

export const ENGINE_FNS: CallableUnitSystemFunctions<EngineData, EngineDeps> = {
    move: {
        description: 'Commands the unit to move to a specified position (must be a neighbouring tile)',
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { nav }) {
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
                    returnToCpu(ctx, { type: 'flag', value: isNbor }, 1);

                    if (!isNbor) {
                        return;
                    }

                    ctx.update({ location: destination });
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
            };
        },
    });
}
