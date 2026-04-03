import { createMemo, For, Show, type Component, type JSX } from 'solid-js';
import type { InventoryData } from '@/game';
import { Symbols } from '@/lib/ascii';
import styles from './Inventory.module.css';
import type { KnownResourceName } from '@/game/worldgen/resources';

const RESOURCE_COLORS: Record<KnownResourceName, string> = {
    copper: '#ef943f',
    titanium: '#aab5c0',
};

const DEFAULT_COLOR = '#bfbfbf';

const InventoryItem: Component<{ resource: string; amount: number; cost: number | undefined }> = (props) => {
    return (
        <div
            class={styles.item}
            title={props.resource}
            classList={{
                [styles.notEnough]: props.cost !== undefined && props.cost > props.amount,
            }}
            style={{
                '--inventory-item-color': RESOURCE_COLORS[props.resource as never] ?? DEFAULT_COLOR,
            }}
        >
            <div class={styles.amount}>
                <Show when={props.cost !== undefined} fallback={props.amount}>
                    <span class={styles.cost}>{props.cost}</span>/{props.amount}
                </Show>
            </div>
            <div class={styles.icon}>{Symbols.ParallelogramOutline}</div>
            <div class={styles.label}>{props.resource}</div>
        </div>
    );
};

export const InventoryContent: Component<{
    contents: Record<string, number>;
    costs?: Record<string, number>;
    concise?: boolean;
    empty?: JSX.Element;
}> = (props) => {
    const items = createMemo(() => {
        const costs = props.costs;
        return Object.entries(props.contents)
            .map(([resource, amount]) => {
                return { resource, amount, cost: costs ? costs[resource] : undefined };
            })
            .filter((entry) => entry.amount > 0);
    });

    return (
        <div class={styles.contents} classList={{ [styles.concise]: props.concise }}>
            <For each={items()} fallback={props.empty}>
                {(item) => {
                    return <InventoryItem resource={item.resource} amount={item.amount} cost={item.cost} />;
                }}
            </For>
        </div>
    );
};

export const Inventory: Component<{
    data: InventoryData;
}> = (props) => {
    const status = createMemo(() => {
        const { size, capacity } = props.data;
        return `Size: ${size.toFixed()} / ${Number.isFinite(capacity) ? capacity.toFixed() : Symbols.Lemniscate}`;
    });

    return (
        <div class={styles.inventory}>
            <div class={styles.status}>{status()}</div>
            <InventoryContent contents={props.data.contents} empty={<div class={styles.empty}>Inventory empty</div>} />
        </div>
    );
};
