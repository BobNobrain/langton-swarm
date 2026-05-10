import { createMemo, For, Show, type Component, type JSX } from 'solid-js';
import type { InventoryData, KnownResourceName, UnitId } from '@/game';
import { Symbols } from '@/lib/ascii';
import { getStaticDropzones, InventoryTransfer } from './dragndrop';
import { DropZoneDynamic, DropZoneStatic } from './dropzones';
import styles from './Inventory.module.css';

export const RESOURCE_COLORS: Record<KnownResourceName, string> = {
    electrical: '#ef943f',
    structural: '#94b9df',
    energetical: '#bcc0aa',
    combat: '#d16969',
    special: '#7dd0da',
};

export const RESOURCE_NAMES: Record<KnownResourceName, string> = {
    electrical: 'Copper',
    structural: 'Titanium',
    energetical: 'Lithium',
    combat: 'Crystals',
    special: 'Diamonds',
};

export const RESOURCE_ICONS: Record<KnownResourceName, string> = {
    electrical: Symbols.ParallelogramOutline,
    structural: Symbols.ParallelogramOutline,
    energetical: Symbols.ParallelogramOutline,
    combat: Symbols.CircleDoubleOutline,
    special: Symbols.RhombusOutline,
};

const DEFAULT_COLOR = '#bfbfbf';

export type DragInfo = {
    source: UnitId;
};

const InventoryItem: Component<{ resource: string; amount: number; cost: number | undefined; dragInfo?: DragInfo }> = (
    props,
) => {
    return (
        <div
            class={styles.item}
            title={RESOURCE_NAMES[props.resource as KnownResourceName] ?? props.resource}
            classList={{
                [styles.notEnough]: props.cost !== undefined && props.cost > props.amount,
            }}
            style={{
                '--inventory-item-color': RESOURCE_COLORS[props.resource as KnownResourceName] ?? DEFAULT_COLOR,
            }}
            draggable={Boolean(props.dragInfo)}
            onDragStart={() => {
                if (!props.dragInfo) {
                    return;
                }

                InventoryTransfer.startFromUnit(props.dragInfo.source, props.resource, props.amount);
            }}
            onDragEnd={InventoryTransfer.cancel}
        >
            <div class={styles.amount}>
                <Show when={props.cost !== undefined} fallback={props.amount}>
                    <span class={styles.cost}>{props.cost}</span>/{props.amount}
                </Show>
            </div>
            <div class={styles.icon}>
                {RESOURCE_ICONS[props.resource as KnownResourceName] ?? Symbols.ParallelogramOutline}
            </div>
            <div class={styles.label}>{RESOURCE_NAMES[props.resource as KnownResourceName] ?? props.resource}</div>
        </div>
    );
};

export const InventoryContent: Component<{
    contents: Record<string, number>;
    costs?: Record<string, number>;
    concise?: boolean;
    empty?: JSX.Element;
    dragInfo?: DragInfo;
}> = (props) => {
    const items = createMemo(() => {
        const costs = props.costs;
        return Object.entries(props.contents)
            .map(([resource, amount]) => {
                return { resource, amount, cost: costs ? costs[resource] : undefined };
            })
            .filter((entry) => entry.amount > 0)
            .sort((a, b) => a.resource.localeCompare(b.resource));
    });

    return (
        <div class={styles.contents} classList={{ [styles.concise]: props.concise }}>
            <For each={items()} fallback={props.empty}>
                {(item) => {
                    return (
                        <InventoryItem
                            resource={item.resource}
                            amount={item.amount}
                            cost={item.cost}
                            dragInfo={props.dragInfo}
                        />
                    );
                }}
            </For>
        </div>
    );
};

export const Inventory: Component<{
    data: InventoryData;
    headerAction?: JSX.Element;
    dragInfo?: DragInfo;
    fullHeight?: boolean;
}> = (props) => {
    const status = createMemo(() => {
        const { size, capacity } = props.data;
        return `Size: ${size.toFixed()} / ${Number.isFinite(capacity) ? capacity.toFixed() : Symbols.Lemniscate}`;
    });

    const isDropZoneVisible = () => {
        const transferData = InventoryTransfer.rTransferData();
        return transferData && transferData.source !== props.dragInfo?.source;
    };

    const staticDropZones = createMemo(() => {
        const transferData = InventoryTransfer.rTransferData();
        if (!transferData) {
            return [];
        }

        return getStaticDropzones(transferData.amountAvailable, props.data.capacity - props.data.size);
    });

    return (
        <div class={styles.inventory} classList={{ [styles.fullHeight]: props.fullHeight }}>
            <div class={styles.header}>
                <div class={styles.status}>{status()}</div>
                {props.headerAction}
            </div>
            <InventoryContent
                contents={props.data.contents}
                dragInfo={props.dragInfo}
                empty={<div class={styles.empty}>Inventory empty</div>}
            />
            <Show when={isDropZoneVisible()}>
                <div class={styles.dropZoneWrapper}>
                    <DropZoneDynamic
                        target={props.dragInfo!.source}
                        availableSpace={props.data.capacity - props.data.size}
                    />

                    <div class={styles.dropZonesStatic}>
                        <For each={staticDropZones()}>
                            {({ text, amount }) => {
                                return <DropZoneStatic target={props.dragInfo!.source} text={text} amount={amount} />;
                            }}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
};
