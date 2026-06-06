import { getDrillProperties } from '../config';
import { InventoryDelta } from '../inventory';
import type { ResourceTier } from '../resources';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { InventoryController } from './inventory';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { fnReturn, fnSleep, UnitSystem } from './UnitSystem';

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

export const DRILL_FNS = {
    mine: UnitSystem.declareFn({
        name: 'mine',
        args: {},
        returnType: 'flag',
        description: 'Commands the drill to mine a batch of any resource deposit that unit has underneath it',
    }),
    probe: UnitSystem.declareFn({
        name: 'probe',
        args: {},
        returnType: 'flag',
        description: 'Allows to check if there is a resource deposit underneath',
    }),
} as const;

export class DrillSystem extends UnitSystem<DrillData> {
    constructor(
        opts: UnitSystemOrchestrator,
        world: DrillDeps['world'],
        positions: PositionalSystemController,
        inventory: InventoryController,
        battery: EnergySystemController,
    ) {
        super(DRILL_SYSTEM_NAME, opts);

        this.registerFn(DRILL_FNS.mine).implement<{
            position?: NodeId;
            energyDrained?: boolean;
        }>((state, ctx) => {
            const drill = ctx.systemData;

            if (state.position === undefined) {
                state.position = positions.getEffectivePosition(ctx.unitId);
            }

            if (!state.energyDrained) {
                const hasEnough = battery.withdraw(ctx.unitId, drill.powerConsumption);
                if (!hasEnough) {
                    return fnReturn({ type: 'flag', value: false });
                }

                state.energyDrained = true;
                return fnSleep(drill.drillTime);
            }

            const mined = world.resources.mine({
                location: state.position,
                maxAmount: Math.min(drill.drillAmount, inventory.getFreeSpace(ctx.unitId)),
                maxTier: drill.tier,
                resource: undefined, // TODO: add ability to specify which resource to mine
            });

            if (!InventoryDelta.isEmpty(mined)) {
                inventory.add({
                    to: ctx.unitId,
                    amounts: mined.content,
                });

                return fnReturn({ type: 'flag', value: true });
            }

            return fnReturn({ type: 'flag', value: false });
        });

        this.registerFn(DRILL_FNS.probe).implement((_, ctx) => {
            const deposits = world.resources.findDeposits({
                location: positions.getEffectivePosition(ctx.unitId),
                maxTier: ctx.systemData.tier,
            });
            let result = deposits.some((d) => d.amount > 0);

            if (!battery.withdraw(ctx.unitId, 1)) {
                return fnReturn({ type: 'flag', value: false });
            }

            return fnReturn({ type: 'flag', value: result }, 1);
        });
    }

    protected initialData({ config }: SpawnOptions): DrillData | null {
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
    }
}
