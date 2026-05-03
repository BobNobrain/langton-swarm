import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { createEvent, type Event } from '@/lib/sparse';
import { NodeId } from './types';
import { InventoryDelta } from './inventory';

export type KnownResourceName = 'electrical' | 'structural' | 'energetical' | 'special' | 'combat';
export enum ResourceTier {
    Tier1 = 1,
    Tier2 = 2,
}

export type ResourceDeposit = {
    resource: string;
    amount: number;
    tier: ResourceTier;
    isDiscovered: boolean;
};

export type ResourceUpdateEvent = Event<(at: NodeId) => void>;

export class PlanetaryResources {
    private depositsByLocation = new Map<NodeId, ResourceDeposit[]>();
    readonly updated: ResourceUpdateEvent = createEvent();

    constructor(private graph: PlanetGraph) {}

    add(location: NodeId, resource: string, tier: ResourceTier, amount: number) {
        const deposits = this.depositsByLocation.getOrInsert(location, []);
        for (const deposit of deposits) {
            if (deposit.resource === resource && deposit.tier === tier) {
                deposit.amount += amount;
                return;
            }
        }

        deposits.push({
            resource,
            amount,
            tier,
            isDiscovered: tier === ResourceTier.Tier1,
        });
    }

    getDepositsAt(location: NodeId): ResourceDeposit[] {
        return this.depositsByLocation.get(location) ?? [];
    }

    mine(opts: {
        location: NodeId;
        maxTier: ResourceTier;
        maxAmount: number;
        resource: string | undefined;
    }): InventoryDelta {
        const deposits = this.findDeposits({ location: opts.location, maxTier: opts.maxTier, resource: opts.resource });
        const result = InventoryDelta.empty();

        for (const deposit of deposits) {
            const amount = Math.min(opts.maxAmount, deposit.amount);
            if (!amount) {
                continue;
            }

            deposit.amount -= amount;
            result.alter(deposit.resource, amount);
        }

        if (result.size > 0) {
            this.updated.trigger(opts.location);
        }

        return result;
    }

    discover(location: NodeId, maxTier: ResourceTier) {
        const deposits = this.depositsByLocation.get(location);
        if (!deposits) {
            return [];
        }

        const changed: ResourceDeposit[] = [];
        for (const deposit of deposits) {
            if (deposit.tier <= maxTier && !deposit.isDiscovered) {
                deposit.isDiscovered = true;
                changed.push(deposit);
            }
        }

        if (changed.length > 0) {
            this.updated.trigger(location);
        }

        return changed;
    }

    findDeposits(filters: {
        location: NodeId;
        maxTier?: ResourceTier;
        resource?: string;
        includeUndiscovered?: boolean;
    }): ResourceDeposit[] {
        const locals = this.depositsByLocation.get(filters.location);
        if (!locals) {
            return [];
        }

        return locals.filter((deposit) => {
            if (filters.maxTier !== undefined && deposit.tier > filters.maxTier) {
                return false;
            }

            if (filters.resource !== undefined && deposit.resource !== filters.resource) {
                return false;
            }

            if (!filters.includeUndiscovered && !deposit.isDiscovered) {
                return false;
            }

            return true;
        });
    }

    getAll() {
        const result: { location: NodeId; deposits: ResourceDeposit[] }[] = [];

        for (const [location, deposits] of this.depositsByLocation.entries()) {
            result.push({ location, deposits });
        }

        return result;
    }
}
