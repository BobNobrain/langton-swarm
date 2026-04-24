import { type Component, type ParentComponent } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import { getConstructionCosts, getConstructionTime } from '@/game/config';
import { InventoryContent } from '../Inventory/Inventory';
import { Select, type SelectOption } from '../Select/Select';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import { Toggle } from '../Toggle/Toggle';
import { ASSEMBLER_OPTIONS, CustomAssemblerOption } from './assembler';
import { BATTERY_OPTIONS, CustomBatteryOption } from './battery';
import { CustomDrillOption, DRILL_OPTIONS } from './drill';
import { ENGINE_OPTIONS, CustomEngineOption } from './engine';
import { CustomSolarOption, SOLAR_OPTIONS } from './solar';
import { CustomStorageOption, STORAGE_OPTIONS } from './storage';
import styles from './Configurator.module.css';

const ConfiguratorField: ParentComponent<{ name: string; config: UnitConfiguration }> = (props) => {
    return (
        <div class={styles.field}>
            <div class={styles.fieldName}>{props.name}</div>
            <div class={styles.fieldInput}>{props.children}</div>
            <div class={styles.fieldCosts}>
                <div class={styles.timeCost}>
                    <TimeLabel ticks={getConstructionTime(props.config) || null} />
                </div>
                <InventoryContent contents={getConstructionCosts(props.config)} concise empty="--" />
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
                        value={findValue(ENGINE_OPTIONS, props.value?.engine)}
                        onUpdate={(option) => {
                            props.onUpdate({ engine: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomEngineOption}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Navigator" config={{ navigator: Boolean(props.value?.navigator) }}>
                    <Toggle
                        value={Boolean(props.value?.navigator)}
                        onUpdate={(value) => props.onUpdate({ navigator: value })}
                        label={props.value?.navigator ? 'Enabled' : 'Disabled'}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Drill" config={{ drill: props.value?.drill }}>
                    <Select
                        options={DRILL_OPTIONS}
                        value={findValue(DRILL_OPTIONS, props.value?.drill)}
                        onUpdate={(option) => {
                            props.onUpdate({ drill: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomDrillOption}
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
                        value={findValue(STORAGE_OPTIONS, props.value?.storage)}
                        onUpdate={(option) => {
                            props.onUpdate({ storage: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomStorageOption}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Solar Panels" config={{ solar: props.value?.solar ?? undefined }}>
                    <Select
                        options={SOLAR_OPTIONS}
                        value={findValue(SOLAR_OPTIONS, props.value?.solar)}
                        onUpdate={(option) => {
                            props.onUpdate({ solar: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomSolarOption}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Batteries" config={{ battery: props.value?.battery ?? undefined }}>
                    <Select
                        options={BATTERY_OPTIONS}
                        value={findValue(BATTERY_OPTIONS, props.value?.battery)}
                        onUpdate={(option) => {
                            props.onUpdate({ battery: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomBatteryOption}
                    />
                </ConfiguratorField>
                <ConfiguratorField name="Assembler" config={{ battery: props.value?.battery ?? undefined }}>
                    <Select
                        options={ASSEMBLER_OPTIONS}
                        value={findValue(ASSEMBLER_OPTIONS, props.value?.assembler)}
                        onUpdate={(option) => {
                            props.onUpdate({ assembler: option.value ?? undefined });
                        }}
                        popupOpening="manual"
                        dark
                        sidewaySwitchable
                        customOption={CustomAssemblerOption}
                    />
                </ConfiguratorField>
            </div>
            <div class={styles.costs}>
                <div class={styles.costLabel}>Total:</div>
                <div class={styles.timeCost}>
                    <TimeLabel ticks={props.value ? getConstructionTime(props.value) : null} />
                </div>
                <InventoryContent contents={props.value ? getConstructionCosts(props.value) : {}} concise />
            </div>
        </div>
    );
};

function findValue<T>(opts: SelectOption<T | null>[], value: T | null | undefined): SelectOption<T | null> {
    return (
        opts.find((opt) => {
            if (opt.value === null || value === null) {
                return opt.value === value;
            }

            return opt.value === value;
        }) ?? opts[0]
    );
}
