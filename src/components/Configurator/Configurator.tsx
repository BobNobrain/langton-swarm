import { type Component, type ParentComponent } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import { getConstructionCosts, getConstructionTime } from '@/game/construction';
import { ENGINE_ADVANCED_PRESET, ENGINE_EXTREME_PRESET, ENGINE_SIMPLE_PRESET } from '@/game/presets/engine';
import {
    STORAGE_LARGE_PRESET,
    STORAGE_MEDIUM_PRESET,
    STORAGE_SMALL_PRESET,
    STORAGE_TINY_PRESET,
    STORAGE_WAREHOUSE_PRESET,
} from '@/game/presets/storage';
import { InventoryContent } from '../Inventory/Inventory';
import { Select, type SelectOption } from '../Select/Select';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import { Toggle } from '../Toggle/Toggle';
import styles from './Configurator.module.css';

type EngineConfig = NonNullable<UnitConfiguration['engine']>;

const ENGINE_OPTIONS: SelectOption<EngineConfig | null>[] = [
    { text: 'None', value: null },
    { text: 'Simple', value: ENGINE_SIMPLE_PRESET },
    { text: 'Advanced', value: ENGINE_ADVANCED_PRESET },
    { text: 'Extreme', value: ENGINE_EXTREME_PRESET },
];

type StorageConfig = NonNullable<UnitConfiguration['storage']>;
const STORAGE_OPTIONS: SelectOption<StorageConfig | null>[] = [
    { text: 'None', value: null },
    { text: 'Tiny', value: STORAGE_TINY_PRESET },
    { text: 'Small', value: STORAGE_SMALL_PRESET },
    { text: 'Medium', value: STORAGE_MEDIUM_PRESET },
    { text: 'Large', value: STORAGE_LARGE_PRESET },
    { text: 'Warehouse', value: STORAGE_WAREHOUSE_PRESET },
];

const ConfiguratorField: ParentComponent<{ name: string; config: UnitConfiguration }> = (props) => {
    return (
        <div class={styles.field}>
            <div class={styles.fieldName}>{props.name}</div>
            <div class={styles.fieldInput}>{props.children}</div>
            <div class={styles.fieldCosts}>
                <InventoryContent contents={getConstructionCosts(props.config)} concise empty="--" />
                <div class={styles.timeCost}>
                    <TimeLabel ticks={getConstructionTime(props.config) || null} />
                </div>
            </div>
        </div>
    );
};

export const Configurator: Component<{
    value: UnitConfiguration | null;
    readonly: boolean;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
}> = (props) => {
    return (
        <div class={styles.configurator}>
            <div class={styles.toggles}>
                <ConfiguratorField
                    name="Engine"
                    config={{
                        engine: props.value?.engine ?? undefined,
                    }}
                >
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
                </ConfiguratorField>
                <ConfiguratorField name="Navigator" config={{ navigator: Boolean(props.value?.navigator) }}>
                    <Toggle
                        value={Boolean(props.value?.navigator)}
                        onUpdate={(value) => props.onUpdate({ navigator: value })}
                        label={props.value?.navigator ? 'Enabled' : 'Disabled'}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Drill" config={{ drill: Boolean(props.value?.drill) }}>
                    <Toggle
                        value={Boolean(props.value?.drill)}
                        onUpdate={(value) => props.onUpdate({ drill: value })}
                        label={props.value?.drill ? 'Enabled' : 'Disabled'}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Scanner" config={{ scanner: Boolean(props.value?.scanner) }}>
                    <Toggle
                        value={Boolean(props.value?.scanner)}
                        onUpdate={(value) => props.onUpdate({ scanner: value })}
                        label={props.value?.scanner ? 'Enabled' : 'Disabled'}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Storage" config={{ storage: props.value?.storage ?? undefined }}>
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
                </ConfiguratorField>
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
