import { Show, type Component, type ParentComponent } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import {
    getBatteryCapacity,
    getConstructionCosts,
    getConstructionTime,
    getDrillProperties,
    getEnergyPerMove,
    getMaxSolarPower,
    getStorageCapacity,
    getTicksPerMove,
    getUnitMass,
} from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { Heading } from '../Header/Header';
import { InventoryContent } from '../Inventory/Inventory';
import { Select, type SelectOption } from '../Select/Select';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import { ASSEMBLER_OPTIONS, CustomAssemblerOption } from './assembler';
import { BATTERY_OPTIONS, CustomBatteryOption } from './battery';
import { CustomDrillOption, DRILL_OPTIONS } from './drill';
import { ENGINE_OPTIONS, CustomEngineOption } from './engine';
import { CustomNavigatorOption, NAVIGATOR_OPTIONS } from './navigator';
import { CustomScannerOption, SCANNER_OPTIONS } from './scanner';
import { CustomSolarOption, SOLAR_OPTIONS } from './solar';
import { CustomStorageOption, STORAGE_OPTIONS } from './storage';
import styles from './Configurator.module.css';
import { useGame } from '@/gameContext';

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
    const { world, gameTick } = useGame();

    return (
        <div class={styles.configurator}>
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
                <Select
                    options={NAVIGATOR_OPTIONS}
                    value={findValue(NAVIGATOR_OPTIONS, props.value?.navigator) ?? false}
                    onUpdate={(option) => {
                        props.onUpdate({ navigator: option.value });
                    }}
                    popupOpening="manual"
                    dark
                    sidewaySwitchable
                    customOption={CustomNavigatorOption}
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
                <Select
                    options={SCANNER_OPTIONS}
                    value={findValue(SCANNER_OPTIONS, props.value?.scanner) ?? false}
                    onUpdate={(option) => {
                        props.onUpdate({ scanner: option.value });
                    }}
                    popupOpening="manual"
                    dark
                    sidewaySwitchable
                    customOption={CustomScannerOption}
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

            <Heading size="sm" withMargin>
                Total
            </Heading>
            <div class={styles.field}>
                <div class={styles.fieldName}>Cost</div>
                <div class={styles.fieldBadges}>
                    <div class={styles.timeCost}>
                        <TimeLabel
                            ticks={props.value ? getConstructionTime(props.value) : null}
                            title="Construction time"
                        />
                    </div>
                    <InventoryContent contents={props.value ? getConstructionCosts(props.value) : {}} concise />
                </div>
            </div>

            <div class={styles.field}>
                <div class={styles.fieldName}>Movement</div>
                <div class={styles.fieldBadges}>
                    <TimeLabel ticks={getTicksPerMove(props.value ?? {})} title="Time to move 1 step" />
                    <Badge icon="m" title="Unit mass">
                        {getUnitMass(props.value ?? {})}
                    </Badge>
                    <Badge icon={Symbols.HalfFilledSquareLeft} title="Energy per move">
                        {getEnergyPerMove(props.value ?? {})}
                    </Badge>
                </div>
            </div>

            <div class={styles.field}>
                <div class={styles.fieldName}>Energy</div>
                <div class={styles.fieldBadges}>
                    <Badge icon={Symbols.HalfFilledSquareLeft} title="Battery capacity">
                        {getBatteryCapacity(props.value ?? {})}
                    </Badge>
                    <Badge icon={Symbols.SquareGrid} title="Approximate energy gained per day">
                        {estimateSolarInputPerCycle(props.value, world.dayLengthTicks)}
                    </Badge>
                </div>
            </div>

            <div class={styles.field}>
                <div class={styles.fieldName}>Storage</div>
                <div class={styles.fieldBadges}>
                    <Badge icon={Symbols.ParallelogramOutline} title="Storage capacity">
                        {getStorageCapacity(props.value ?? {})}
                    </Badge>
                    <Show when={props.value?.drill}>
                        <TimeLabel ticks={getTimeToFill(props.value)} title="Time to fill" />
                    </Show>
                </div>
            </div>
        </div>
    );
};

function findValue<T>(opts: SelectOption<T>[], value: T | undefined): SelectOption<T> {
    return (
        opts.find((opt) => {
            if (opt.value === null || value === null) {
                return opt.value === value;
            }

            return opt.value === value;
        }) ?? opts[0]
    );
}

function estimateSolarInputPerCycle(config: UnitConfiguration | null, dayLengthTicks: number) {
    if (!config) {
        return 0;
    }

    const maxOutput = getMaxSolarPower(config);
    const overDay = maxOutput * dayLengthTicks;
    return overDay;
}

function getTimeToFill(config: UnitConfiguration | null) {
    if (!config) {
        return 0;
    }

    const { miningAmount, miningTime } = getDrillProperties(config);
    const cap = getStorageCapacity(config);
    const itemsPerTick = miningAmount / miningTime;
    const timeToFill = cap / itemsPerTick;
    return Math.round(timeToFill);
}
