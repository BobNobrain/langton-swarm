import { getDrillProperties } from '../config';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
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

type DrillData = {
    drillTime: number;
    drillAmount: number;
    powerConsumption: number;
    tier: number;
};

type DrillDeps = {
    world: Pick<GameWorld, 'resources' | 'mineResource'>;
    inventory: InventoryController;
    battery: EnergySystemController;
};

export const DRILL_SYSTEM_NAME = 'drill';

const schedule = createScheduler<DrillData>(DRILL_SYSTEM_NAME);

export const DRILL_FNS: CallableUnitSystemFunctions<DrillData, DrillDeps> = {
    mine: {
        description: 'Commands the drill to mine 1 unit of any resource deposit that unit has underneath it',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world, inventory, battery }) {
            const drill = ctx.systemData;

            schedule(
                ctx,
                (ctx, env) => {
                    const resource = world.resources.get(ctx.state.location);
                    let success = false;
                    const drill = ctx.systemData;
                    const amountToMine = Math.min(drill.drillAmount, resource?.amount ?? 0);

                    if (resource && resource.amount > 0) {
                        if (battery.withdraw(ctx.unitId, drill.powerConsumption)) {
                            const effectiveAmount =
                                inventory.add({
                                    to: ctx.unitId,
                                    amounts: { [resource.resource]: amountToMine },
                                    tick: env.currentTick,
                                })[resource.resource] ?? 0;
                            world.mineResource(ctx.state.location, resource.resource, effectiveAmount);
                            success = true;
                        }
                    }

                    returnToCpu(ctx, { type: 'flag', value: success });
                },
                drill.drillTime,
            );
            return false;
        },
    },
    probe: {
        description: 'Allows to check if there is a resource deposit underneath',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world, battery }) {
            const deposit = world.resources.get(ctx.state.location);
            let result = deposit !== undefined && deposit.amount > 0;

            if (!battery.withdraw(ctx.unitId, 1)) {
                result = false;
            }

            returnToCpu(ctx, { type: 'flag', value: result }, 1);
            return false;
        },
    },
};

export function createDrillSystem(
    opts: CreateUnitSystemCommonOptions,
    world: DrillDeps['world'],
    inventory: InventoryController,
    battery: EnergySystemController,
) {
    return createUnitSystem<DrillData, CallableUnitSystemMessages & UnitSystemScheduleMessages<DrillData>>(opts, {
        name: DRILL_SYSTEM_NAME,
        initialData(config, state, unitId) {
            if (!config.drill) {
                return null;
            }

            const chars = getDrillProperties(config);

            return {
                drillAmount: chars.miningAmount,
                drillTime: chars.miningTime,
                powerConsumption: chars.energyConsumption,
                tier: chars.maxDepositTier,
            };
        },

        messages: {
            ...callableUnitSystemHandlers({ world, inventory, battery }, DRILL_FNS),
            ...schedulerMessageHandlers(),
        },
    });
}
