import { getDrillProperties } from '../config';
import type { ResourceTier } from '../resources';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
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
    tier: ResourceTier;
    radius: number;
};

type DrillDeps = {
    world: Pick<GameWorld, 'resources'>;
    inventory: InventoryController;
    battery: EnergySystemController;
    positions: PositionalSystemController;
};

export const DRILL_SYSTEM_NAME = 'drill';

const schedule = createScheduler<DrillData>(DRILL_SYSTEM_NAME);

export const DRILL_FNS: CallableUnitSystemFunctions<DrillData, DrillDeps> = {
    mine: {
        description: 'Commands the drill to mine a batch of any resource deposit that unit has underneath it',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world, inventory, battery, positions }) {
            const drill = ctx.systemData;

            schedule(
                ctx,
                (ctx, env) => {
                    const position = positions.getEffectivePosition(ctx.unitId);
                    let success = false;
                    const drill = ctx.systemData;

                    if (battery.withdraw(ctx.unitId, drill.powerConsumption)) {
                        const mined = world.resources.mine({
                            location: position,
                            maxAmount: Math.min(drill.drillAmount, inventory.getFreeSpace(ctx.unitId)),
                            maxTier: drill.tier,
                            resource: undefined, // TODO: add ability to specify which resource to mine
                        });

                        if (!mined.isEmpty()) {
                            inventory.add({
                                to: ctx.unitId,
                                amounts: mined.content,
                                tick: env.currentTick,
                            });

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
        init(_args, ctx, _env, { world, battery, positions }) {
            const deposits = world.resources.getDepositsAt(positions.getEffectivePosition(ctx.unitId));
            let result = deposits.some((d) => d.amount > 0);

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
    positions: PositionalSystemController,
    inventory: InventoryController,
    battery: EnergySystemController,
) {
    return createUnitSystem<DrillData, CallableUnitSystemMessages & UnitSystemScheduleMessages<DrillData>>(opts, {
        name: DRILL_SYSTEM_NAME,
        initialData({ config }) {
            if (!config.drill) {
                return null;
            }

            const chars = getDrillProperties(config);

            return {
                drillAmount: chars.miningAmount,
                drillTime: chars.miningTime,
                powerConsumption: chars.energyConsumption,
                tier: chars.maxDepositTier,
                radius: chars.miningRadius,
            };
        },

        messages: {
            ...callableUnitSystemHandlers({ world, inventory, battery, positions }, DRILL_FNS),
            ...schedulerMessageHandlers(),
        },
    });
}
