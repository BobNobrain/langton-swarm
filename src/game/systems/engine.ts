import { pick } from '@/lib/random';
import { extractTyped } from '../program/utils';
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
import { getTicksPerMove } from '../config';

type EngineData = {
    ticksPerMove: number;
};

type EngineDeps = Pick<GameWorld, 'surface'>;

export const ENGINE_SYSTEM_NAME = 'engine';
const schedule = createScheduler(ENGINE_SYSTEM_NAME);

export const ENGINE_FNS: CallableUnitSystemFunctions<EngineData, EngineDeps> = {
    move: {
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { surface }) {
            const currentPosition = ctx.state.location;
            const to = extractTyped(args, 'to', 'position', {
                zero: { type: 'position', value: currentPosition },
                random: {
                    type: 'position',
                    value: pick(Math.random, Array.from(surface[currentPosition].connections.values())),
                },
            })!;

            const engine = ctx.systemData;
            const destination = to.value;

            schedule(
                ctx,
                (ctx, env) => {
                    const isNbor = surface[ctx.state.location].connections.has(destination);
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
