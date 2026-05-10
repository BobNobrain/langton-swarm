import { createSignal } from 'solid-js';
import type { InventoryController, UnitId } from '@/game';

type TransferData = {
    source: UnitId;
    resource: string;
    amountAvailable: number;
};

const [rTransferData, rSetTransferData] = createSignal<TransferData | null>(null);

export const InventoryTransfer = {
    rIsTransfering: () => rTransferData() !== null,
    rTransferData,

    startFromUnit: (unitId: UnitId, resource: string, available: number) => {
        rSetTransferData((old) => {
            if (old) {
                return old;
            }

            return { source: unitId, resource, amountAvailable: available };
        });
    },

    confirm: (target: UnitId, amount: number, inventory: InventoryController) => {
        const data = rTransferData();
        if (!data) {
            return;
        }

        inventory.transfer({
            from: data.source,
            to: target,
            amounts: { [data.resource]: Math.min(data.amountAvailable, amount) },
            strategy: 'max',
        });
    },

    cancel: () => rSetTransferData(null),
};

export type DropZoneParams = {
    text: string;
    amount: number;
};

export function getStaticDropzones(amountAvailable: number, spaceAvailable: number): DropZoneParams[] {
    const result: DropZoneParams[] = [];
    const maxAmount = Math.min(amountAvailable, spaceAvailable);

    if (maxAmount > 10) {
        result.push({ text: '10', amount: 10 });
    } else if (maxAmount > 5) {
        result.push({ text: '5', amount: 5 });
    }

    if (maxAmount > 100) {
        result.push({ text: '100', amount: 100 });
    } else if (maxAmount > 50) {
        result.push({ text: '50', amount: 50 });
    } else if (maxAmount > 20) {
        result.push({ text: '20', amount: 20 });
    }

    if (maxAmount > 1000) {
        result.push({ text: '1K', amount: 1000 });
    } else if (maxAmount > 500) {
        result.push({ text: '500', amount: 500 });
    } else if (maxAmount > 200) {
        result.push({ text: '200', amount: 200 });
    }

    if (maxAmount > 1) {
        result.push({ text: '1', amount: 1 });
    }
    if (maxAmount > 3) {
        const half = Math.floor(amountAvailable / 2);

        if (half < maxAmount) {
            result.push({ text: 'HALF', amount: half });
        }
    }

    if (amountAvailable <= spaceAvailable) {
        result.push({ text: 'ALL', amount: amountAvailable });
    } else {
        result.push({ text: `MAX (${maxAmount.toString()})`, amount: maxAmount });
    }

    result.sort((a, b) => a.amount - b.amount);

    return result;
}
