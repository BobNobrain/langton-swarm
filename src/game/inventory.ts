export type InventoryDelta = {
    readonly content: {
        readonly [key in string]: number;
    };
    readonly size: number;

    isEmpty(this: InventoryDelta): boolean;

    get(this: InventoryDelta, resource: string): number;
    set(this: InventoryDelta, resource: string, amount: number): void;
    alter(this: InventoryDelta, resource: string, delta: number): void;
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

    export function combine(delta1: InventoryDelta, delta2: InventoryDelta): InventoryDelta {
        const result = new InventoryDeltaImpl();
        for (const [resource, amount] of Object.entries(delta1.content)) {
            result.set(resource, amount);
        }
        for (const [resource, amount] of Object.entries(delta2.content)) {
            result.set(resource, amount);
        }
        return result;
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
