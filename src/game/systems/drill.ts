import { getDrillProperties } from '../config';
import type { ResourceTier } from '../resources';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import { usfSleep, type CallableUnitSystemFunctions, usfHandlers, CallableUnitSystemMessages } from './func';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

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

export const DRILL_FNS: CallableUnitSystemFunctions<DrillData, DrillDeps> = {
    mine: {
        description: 'Commands the drill to mine a batch of any resource deposit that unit has underneath it',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { world, inventory, battery, positions }) {
            const drill = ctx.systemData;
            const position = positions.getEffectivePosition(ctx.unitId);
            let success = false;

            if (battery.withdraw(ctx.unitId, drill.powerConsumption)) {
                yield usfSleep(drill.drillTime);

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
                    });

                    success = true;
                }
            }

            return { type: 'flag', value: success };
        },
    },
    probe: {
        description: 'Allows to check if there is a resource deposit underneath',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { world, battery, positions }) {
            const deposits = world.resources.findDeposits({
                location: positions.getEffectivePosition(ctx.unitId),
                maxTier: ctx.systemData.tier,
            });
            let result = deposits.some((d) => d.amount > 0);

            if (!battery.withdraw(ctx.unitId, 1)) {
                result = false;
            }

            yield usfSleep(1);
            return { type: 'flag', value: result };
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
    return createUnitSystem<DrillData, CallableUnitSystemMessages>(opts, {
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
            ...usfHandlers(DRILL_FNS, { world, inventory, battery, positions }),
        },
    });
}
