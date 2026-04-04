import { createEffect, createSignal, type Component } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import { getConstructionCosts, getConstructionTime } from '@/game/construction';
import { InventoryContent } from '../Inventory/Inventory';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import { Toggle } from '../Toggle/Toggle';
import styles from './Configurator.module.css';
import { Select, type SelectOption } from '../Select/Select';

type EngineConfig = NonNullable<UnitConfiguration['engine']>;

const ENGINE_OPTIONS: SelectOption<EngineConfig | null>[] = [
    { text: 'No engine', value: null },
    { text: 'Simple engine', value: { power: 1 } },
    { text: 'Advanced engine', value: { power: 2 } },
    { text: 'Extreme engine', value: { power: 3 } },
];

type StorageConfig = NonNullable<UnitConfiguration['storage']>;
const STORAGE_OPTIONS: SelectOption<StorageConfig | null>[] = [
    { text: 'No storage', value: null },
    { text: 'Tiny compartment', value: { size: 10 } },
    { text: 'Small storage', value: { size: 25 } },
    { text: 'Medium storage', value: { size: 50 } },
    { text: 'Large cargo', value: { size: 100 } },
    { text: 'Warehouse', value: { size: 1000 } },
];

export const Configurator: Component<{
    value: UnitConfiguration | null;
    readonly: boolean;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
}> = (props) => {
    return (
        <div class={styles.configurator}>
            <div class={styles.toggles}>
                <Select
                    options={ENGINE_OPTIONS}
                    value={
                        ENGINE_OPTIONS.find((opt) => {
                            const value = props.value?.engine ?? null;
                            if (opt.value === null || value === null) {
                                return opt.value === value;
                            }

                            return opt.value.power === value.power;
                        }) ?? ENGINE_OPTIONS[0]
                    }
                    onUpdate={(option) => {
                        props.onUpdate({ engine: option.value ?? undefined });
                    }}
                    popupOpening="manual"
                    dark
                />
                <Toggle
                    value={Boolean(props.value?.navigator)}
                    onUpdate={(value) => props.onUpdate({ navigator: value })}
                    label="Navigator"
                />
                <Toggle
                    value={Boolean(props.value?.drill)}
                    onUpdate={(value) => props.onUpdate({ drill: value })}
                    label="Drill"
                />
                <Toggle
                    value={Boolean(props.value?.scanner)}
                    onUpdate={(value) => props.onUpdate({ scanner: value })}
                    label="Scanner"
                />
                <Select
                    options={STORAGE_OPTIONS}
                    value={
                        STORAGE_OPTIONS.find((opt) => {
                            const value = props.value?.storage ?? null;
                            if (opt.value === null || value === null) {
                                return opt.value === value;
                            }

                            return opt.value.size === value.size;
                        }) ?? STORAGE_OPTIONS[0]
                    }
                    onUpdate={(option) => {
                        props.onUpdate({ storage: option.value ?? undefined });
                    }}
                    popupOpening="manual"
                    dark
                />
            </div>
            <div class={styles.costs}>
                <div class={styles.costLabel}>Total:</div>
                <InventoryContent contents={props.value ? getConstructionCosts(props.value) : {}} concise />
                <div class={styles.timeCost}>
                    <TimeLabel ticks={props.value ? getConstructionTime(props.value) : null} />
                </div>
            </div>
        </div>
    );
};
