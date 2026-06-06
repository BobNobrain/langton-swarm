import type { KnownResourceName } from './resources';

export type InventoryDelta = {
    readonly content: {
        [key in string]: number;
    };
    size: number;
};

export namespace InventoryDelta {
    const SHORT_NAMES: Record<KnownResourceName, string> = {
        electrical: 'Cu',
        structural: 'Ti',
        energetical: 'Li',
        combat: '◊',
        special: '▼',
    };

    export function empty(): InventoryDelta {
        return { content: {}, size: 0 };
    }

    export function fromSingle(resource: string, amount: number): InventoryDelta {
        const result = empty();
        set(result, resource, amount);
        return result;
    }

    export function fromMany(deltas: Record<string, number>): InventoryDelta {
        const result = empty();
        for (const [resource, amount] of Object.entries(deltas)) {
            set(result, resource, amount);
        }
        return result;
    }

    export function combine(delta1: InventoryDelta, delta2: InventoryDelta, factor1 = 1, factor2 = 1): InventoryDelta {
        const result = empty();
        for (const [resource, amount] of Object.entries(delta1.content)) {
            set(result, resource, amount * factor1);
        }
        for (const [resource, amount] of Object.entries(delta2.content)) {
            set(result, resource, amount * factor2);
        }
        return result;
    }

    export function areEqual(delta1: InventoryDelta, delta2: InventoryDelta): boolean {
        if (delta1.size !== delta2.size) {
            return false;
        }

        const rs1 = Object.keys(delta1.content);
        const rs2 = Object.keys(delta2.content);
        if (rs1.length !== rs2.length) {
            return false;
        }

        for (const resource of rs1) {
            if ((delta1.content[resource] ?? 0) !== (delta2.content[resource] ?? 0)) {
                return false;
            }
        }

        return true;
    }

    export function compare(delta1: InventoryDelta, delta2: InventoryDelta): '>' | '=' | '<' | '?' {
        const rs1 = Object.keys(delta1.content);
        const rs2 = Object.keys(delta2.content);

        let gt = false;
        let lt = false;

        for (const resource of new Set([...rs1, ...rs2])) {
            const amt1 = delta1.content[resource] ?? 0;
            const amt2 = delta2.content[resource] ?? 0;

            if (amt1 > amt2) {
                gt = true;
                continue;
            }
            if (amt1 < amt2) {
                lt = true;
                continue;
            }
        }

        if (gt && lt) {
            return '?';
        }
        if (!gt && !lt) {
            return '=';
        }

        return gt ? '>' : '<';
    }

    export function multiply(delta: InventoryDelta, scalar: number): InventoryDelta {
        const result = empty();

        for (const [resource, amount] of Object.entries(delta.content)) {
            result.content[resource] = amount * scalar;
        }
        result.size *= scalar;

        return result;
    }

    export function min(delta1: InventoryDelta, delta2: InventoryDelta): InventoryDelta {
        const rs = new Set([...Object.keys(delta1.content), ...Object.keys(delta2.content)]);
        const result = empty();

        for (const resource of rs) {
            const amt1 = delta1.content[resource] ?? 0;
            const amt2 = delta2.content[resource] ?? 0;
            const min = Math.min(amt1, amt2);
            result.content[resource] = min;
            result.size += min;
        }

        return result;
    }

    export function abs(delta: InventoryDelta): InventoryDelta {
        const result = empty();

        for (const resource of Object.keys(delta.content)) {
            const amt = Math.max(0, delta.content[resource]);
            result.content[resource] = amt;
            result.size += amt;
        }

        return result;
    }

    export function fulfillment(target: InventoryDelta, actual: InventoryDelta): number {
        let totalProvided = 0;

        for (const resource of Object.keys(target.content)) {
            const targetAmount = target.content[resource];
            const actualAmount = actual.content[resource] ?? 0;
            totalProvided += Math.min(targetAmount, actualAmount);
        }

        return totalProvided / target.size;
    }

    export function isEmpty(target: InventoryDelta): boolean {
        return !Object.values(target.content).some(Boolean);
    }

    export function get(target: InventoryDelta, resource: string): number {
        return target.content[resource] ?? 0;
    }
    export function set(target: InventoryDelta, resource: string, amount: number) {
        const old = target.content[resource] ?? 0;
        target.content[resource] = amount;
        target.size += amount - old;
    }

    export function alter(target: InventoryDelta, resource: string, delta: number): void {
        target.content[resource] ??= 0;
        target.content[resource] += delta;
        target.size += delta;
    }

    export function toShortString(target: InventoryDelta): string {
        const parts: string[] = [];
        for (const resource of Object.keys(target.content)) {
            parts.push(
                (SHORT_NAMES[resource as never] ?? resource.substring(0, 2)) + target.content[resource].toString(),
            );
        }
        return parts.join(';') ?? '--';
    }
}

// TODO: remove?
export type Inventory = {
    readonly content: {
        [key in string]: number;
    };
    size: number;
};

export namespace Inventory {
    export function empty(): Inventory {
        return { content: {}, size: 0 };
    }

    export function fromSingle(resource: string, amount: number): Inventory {
        const result = empty();
        if (amount > 0) {
            set(result, resource, amount);
        }
        return result;
    }

    export function fromMany(amounts: Record<string, number>): Inventory {
        const result = empty();

        for (const [resource, amount] of Object.entries(amounts)) {
            if (amount > 0) {
                set(result, resource, amount);
            }
        }

        return result;
    }

    export function isEmpty(target: Inventory): boolean {
        return target.size === 0;
    }

    export function set(target: Inventory, resource: string, amount: number) {
        amount = Math.max(0, amount);
        const old = target.content[resource] ?? 0;
        target.content[resource] = amount;
        target.size += amount - old;
    }

    export function alter(target: Inventory, resource: string, delta: number): number {
        const oldAmount = target.content[resource] ?? 0;
        const newAmount = Math.max(0, oldAmount + delta);
        if (newAmount > 0) {
            target.content[resource] = newAmount;
        } else {
            delete target.content[resource];
        }

        return newAmount - oldAmount;
    }

    export function apply(target: Inventory, delta: InventoryDelta) {
        const effectiveDelta = InventoryDelta.empty();

        for (const [resource, deltaAmount] of Object.entries(delta.content)) {
            const oldAmount = target.content[resource] ?? 0;
            const newAmount = Math.max(0, oldAmount + deltaAmount);

            if (newAmount > 0) {
                target.content[resource] = newAmount;
            } else {
                delete target.content[resource];
            }

            InventoryDelta.set(effectiveDelta, resource, newAmount - oldAmount);
        }

        return effectiveDelta;
    }

    export function clone(target: Inventory): Inventory {
        return { content: { ...target.content }, size: target.size };
    }
}
