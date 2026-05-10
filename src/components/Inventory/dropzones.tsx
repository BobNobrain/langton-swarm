import { createSignal, Show, type Component } from 'solid-js';
import type { UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { InventoryTransfer } from './dragndrop';
import styles from './Inventory.module.css';

export const DropZoneStatic: Component<{
    target: UnitId;
    amount: number;
    text: string;
}> = (props) => {
    const { units } = useGame();
    const [isDropOver, setIsDropOver] = createSignal(false);

    return (
        <div
            class={styles.dropZone}
            classList={{
                [styles.dropover]: isDropOver(),
            }}
            onDragEnter={() => setIsDropOver(true)}
            onDragLeave={() => setIsDropOver(false)}
            onDragOver={(ev) => {
                if (!InventoryTransfer.rIsTransfering()) {
                    return;
                }

                ev.preventDefault();
            }}
            onDrop={() => {
                InventoryTransfer.confirm(props.target, props.amount, units.inventory);
            }}
        >
            {props.text}
        </div>
    );
};

export const DropZoneDynamic: Component<{
    target: UnitId;
    availableSpace: number;
}> = (props) => {
    const { units } = useGame();
    const [isDropOver, setIsDropOver] = createSignal(false);
    const [dropOverAmount, setDropOverAmount] = createSignal(0);

    let zoneRef!: HTMLDivElement;

    const fillPercentage = () => {
        const transfer = InventoryTransfer.rTransferData();
        if (!transfer) {
            return '100%';
        }

        const max = Math.min(props.availableSpace, transfer.amountAvailable);
        const share = dropOverAmount() / max;
        return (share * 100).toFixed(1) + '%';
    };

    return (
        <div
            ref={zoneRef}
            class={styles.dropZoneDynamic}
            classList={{
                [styles.dropover]: isDropOver(),
            }}
            style={{
                '--drop-zone-fill-width': fillPercentage(),
            }}
            onDragEnter={() => setIsDropOver(true)}
            onDragLeave={() => setIsDropOver(false)}
            onDragOver={(ev) => {
                const transfer = InventoryTransfer.rTransferData();
                if (!transfer) {
                    return;
                }

                ev.preventDefault();

                const { x, width } = zoneRef.getBoundingClientRect();
                const xShare = (ev.clientX - x) / width;
                const maxAmount = Math.min(props.availableSpace, transfer.amountAvailable);
                const amount = Math.round(xShare * maxAmount);
                setDropOverAmount(amount);
            }}
            onDrop={() => {
                InventoryTransfer.confirm(props.target, dropOverAmount(), units.inventory);
            }}
        >
            <Show when={isDropOver()} fallback="Other...">
                {dropOverAmount().toString()}
            </Show>
        </div>
    );
};
