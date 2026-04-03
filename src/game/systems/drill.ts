import type { GameWorld } from '../world';
import type { InventoryController } from './inventory';
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

type DrillData = {};

type DrillDeps = { world: Pick<GameWorld, 'resources' | 'mineResource'>; inventory: InventoryController };

const MINING_TIME_TICKS = 5;
export const DRILL_SYSTEM_NAME = 'drill';

const schedule = createScheduler(DRILL_SYSTEM_NAME);

export const DRILL_FNS: CallableUnitSystemFunctions<DrillData, DrillDeps> = {
    mine: {
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world, inventory }) {
            schedule(
                ctx,
                (ctx, env) => {
                    const resource = world.resources.get(ctx.state.location);
                    let success = false;
                    const amountToMine = 1;

                    if (
                        resource &&
                        resource.amount > 0 &&
                        inventory.add({
                            to: ctx.unitId,
                            amounts: { [resource.resource]: amountToMine },
                            tick: env.currentTick,
                        })
                    ) {
                        world.mineResource(ctx.state.location, resource.resource, amountToMine);
                        success = true;
                    }

                    returnToCpu(ctx, { type: 'flag', value: success });
                },
                MINING_TIME_TICKS,
            );
            return false;
        },
    },
    probe: {
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world }) {
            const deposit = world.resources.get(ctx.state.location);
            returnToCpu(ctx, { type: 'flag', value: deposit !== undefined && deposit.amount > 0 }, 1);
            return false;
        },
    },
};

export function createDrillSystem(
    opts: CreateUnitSystemCommonOptions,
    world: DrillDeps['world'],
    inventory: InventoryController,
) {
    return createUnitSystem<DrillData, CallableUnitSystemMessages & UnitSystemScheduleMessages<DrillData>>(opts, {
        name: DRILL_SYSTEM_NAME,
        initialData(config, state, unitId) {
            if (!config.drill) {
                return null;
            }

            return {};
        },

        messages: {
            ...callableUnitSystemHandlers({ world, inventory }, DRILL_FNS),
            ...schedulerMessageHandlers(),
        },
    });
}
