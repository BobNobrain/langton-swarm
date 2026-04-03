import type { InventoryData } from './types';

type TransferOptions = {
    from: InventoryData | null;
    to: InventoryData | null;
    amounts: Record<string, number>;
    tick: number;
};

export function transferEverything({ from, to, amounts, tick }: TransferOptions): boolean {
    if (from && !hasItems(from, amounts)) {
        return false;
    }
    if (to && !hasSpaceFor(to, amounts)) {
        return false;
    }

    if (from) {
        alter({ target: from, amounts, factor: -1, tick });
    }
    if (to) {
        alter({ target: to, amounts, factor: +1, tick });
    }
    return true;
}

export function transferAsMuchAsPossible({ from, to, amounts, tick }: TransferOptions): Record<string, number> {
    const effectiveAmounts = { ...amounts };
    if (from) {
        cropByLimits(effectiveAmounts, from.contents);
    }
    if (to) {
        cropBySize(effectiveAmounts, to.capacity - to.size);
    }

    if (from) {
        alter({ target: from, amounts: effectiveAmounts, factor: -1, tick });
    }
    if (to) {
        alter({ target: to, amounts: effectiveAmounts, factor: +1, tick });
    }
    return effectiveAmounts;
}

export function hasItems(inv: InventoryData, amounts: Record<string, number>): boolean {
    for (const resource of Object.keys(amounts)) {
        const has = inv.contents[resource] ?? 0;
        if (has < amounts[resource]) {
            return false;
        }
    }

    return true;
}

export function hasSpaceFor(inv: InventoryData, amounts: Record<string, number>): boolean {
    let spaceNeeded = 0;
    for (const amount of Object.values(amounts)) {
        spaceNeeded += amount;
    }
    return inv.capacity - inv.size >= spaceNeeded;
}

export function measure(amounts: Record<string, number>): number {
    let total = 0;
    for (const amount of Object.values(amounts)) {
        total += amount;
    }
    return total;
}

type AlterOptions = {
    target: InventoryData;
    amounts: Record<string, number>;
    factor: number;
    tick: number;
};

export function alter({ target, amounts, factor, tick }: AlterOptions) {
    for (const resource of Object.keys(amounts)) {
        target.contents[resource] ??= 0;
        const delta = amounts[resource] * factor;
        target.contents[resource] += delta;
        target.size += delta;
    }

    target.lastUpdated = tick;
}

export function cropBySize(amounts: Record<string, number>, maxSize: number) {
    let size = 0;
    for (const resource of Object.keys(amounts)) {
        const amount = amounts[resource];
        if (size + amount <= maxSize) {
            size += amount;
            continue;
        }

        amounts[resource] = maxSize - size;
        size = maxSize;
    }
}

export function cropByLimits(amounts: Record<string, number>, limits: Record<string, number>) {
    for (const resource of Object.keys(amounts)) {
        const amount = amounts[resource];
        const limit = limits[resource] ?? 0;

        if (amount > limit) {
            amounts[resource] = limit;
        }
    }
}
