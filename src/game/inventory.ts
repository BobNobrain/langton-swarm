import type { KnownResourceName } from './resources';

export type InventoryDelta = {
    readonly content: {
        readonly [key in string]: number;
    };
    readonly size: number;

    isEmpty(this: InventoryDelta): boolean;

    get(this: InventoryDelta, resource: string): number;
    set(this: InventoryDelta, resource: string, amount: number): void;
    alter(this: InventoryDelta, resource: string, delta: number): void;

    toShortString(): string;
};

export namespace InventoryDelta {
    export function empty(): InventoryDelta {
        return new InventoryDeltaImpl();
    }

    export function fromSingle(resource: string, amount: number): InventoryDelta {
        const result = new InventoryDeltaImpl();
        result.set(resource, amount);
        return result;
    }

    export function fromMany(deltas: Record<string, number>): InventoryDelta {
        const result = new InventoryDeltaImpl();
        for (const [resource, amount] of Object.entries(deltas)) {
            result.set(resource, amount);
        }
        return result;
    }

    export function combine(delta1: InventoryDelta, delta2: InventoryDelta, factor1 = 1, factor2 = 1): InventoryDelta {
        const result = new InventoryDeltaImpl();
        for (const [resource, amount] of Object.entries(delta1.content)) {
            result.set(resource, amount * factor1);
        }
        for (const [resource, amount] of Object.entries(delta2.content)) {
            result.set(resource, amount * factor2);
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
        const result = new InventoryDeltaImpl();

        for (const [resource, amount] of Object.entries(delta.content)) {
            result.content[resource] = amount * scalar;
        }
        result.size *= scalar;

        return result;
    }

    export function min(delta1: InventoryDelta, delta2: InventoryDelta): InventoryDelta {
        const rs = new Set([...Object.keys(delta1.content), ...Object.keys(delta2.content)]);
        const result = new InventoryDeltaImpl();

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
        const result = new InventoryDeltaImpl();

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
}

export type Inventory = {
    readonly content: {
        readonly [key in string]: number;
    };
    readonly size: number;

    isEmpty(this: Inventory): boolean;

    get(this: Inventory, resource: string): number;
    set(this: Inventory, resource: string, amount: number): void;

    alter(this: Inventory, resource: string, delta: number): number;
    apply(this: Inventory, delta: InventoryDelta): InventoryDelta;

    clone(this: Inventory): Inventory;
};

export namespace Inventory {
    export function empty(): Inventory {
        return new InventoryImpl();
    }

    export function fromSingle(resource: string, amount: number): Inventory {
        const result = new InventoryImpl();
        if (amount > 0) {
            result.set(resource, amount);
        }
        return result;
    }

    export function fromMany(amounts: Record<string, number>): Inventory {
        const result = new InventoryImpl();

        for (const [resource, amount] of Object.entries(amounts)) {
            if (amount > 0) {
                result.set(resource, amount);
            }
        }

        return result;
    }
}

const SHORT_NAMES: Record<KnownResourceName, string> = {
    electrical: 'Co',
    structural: 'Ti',
    energetical: 'Li',
    combat: '◊',
    special: '▼',
};

class InventoryDeltaImpl implements InventoryDelta {
    content: Record<string, number> = {};
    size = 0;

    get(resource: string): number {
        return this.content[resource] ?? 0;
    }
    set(resource: string, amount: number) {
        const old = this.content[resource] ?? 0;
        this.content[resource] = amount;
        this.size += amount - old;
    }
    alter(resource: string, delta: number) {
        this.content[resource] ??= 0;
        this.content[resource] += delta;
        this.size += delta;
    }

    isEmpty(): boolean {
        return !Object.values(this.content).some(Boolean);
    }

    toShortString(): string {
        const parts: string[] = [];
        for (const resource of Object.keys(this.content)) {
            parts.push(
                (SHORT_NAMES[resource as never] ?? resource.substring(0, 2)) + this.content[resource].toString(),
            );
        }
        return parts.join(';') ?? '--';
    }
}

class InventoryImpl extends InventoryDeltaImpl implements Inventory {
    isEmpty(): boolean {
        return this.size === 0;
    }

    alter(resource: string, delta: number): number {
        const oldAmount = this.content[resource] ?? 0;
        const newAmount = Math.max(0, oldAmount + delta);
        if (newAmount > 0) {
            this.content[resource] = newAmount;
        } else {
            delete this.content[resource];
        }

        return newAmount - oldAmount;
    }

    apply(delta: InventoryDelta) {
        const effectiveDelta = new InventoryDeltaImpl();

        for (const [resource, deltaAmount] of Object.entries(delta.content)) {
            const oldAmount = this.content[resource] ?? 0;
            const newAmount = Math.max(0, oldAmount + deltaAmount);

            if (newAmount > 0) {
                this.content[resource] = newAmount;
            } else {
                delete this.content[resource];
            }

            effectiveDelta.set(resource, newAmount - oldAmount);
        }

        return effectiveDelta;
    }

    clone(): Inventory {
        const clone = new InventoryImpl();
        clone.content = { ...this.content };
        clone.size = this.size;
        return clone;
    }
}
