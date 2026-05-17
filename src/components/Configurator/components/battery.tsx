import { Show, type Component } from 'solid-js';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { BatteryConfiguration, getBatteryCapacity, SolarConfiguration } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import { UnitComponentWarning } from './warning';
import styles from '../Configurator.module.css';

const BATTERY_OPTIONS: SelectOption<BatteryConfiguration | null>[] = [
    { text: 'No battery', value: null },
    { text: 'Small accumulator', value: BatteryConfiguration.Tier1Small },
    { text: 'Regular power cell', value: BatteryConfiguration.Tier1Regular },
    { text: 'Large power cell', value: BatteryConfiguration.Tier1Big },
    { text: 'Advanced energy storage', value: BatteryConfiguration.Tier2 },
];

const NO_BATTERY_DESCRIPTION = 'No battery – almost no other modules will work!';
const BATTERY_DESCRIPTIONS: Record<BatteryConfiguration, string> = {
    [BatteryConfiguration.Tier1Small]: "A lightweight option for units that don't need much energy.",
    [BatteryConfiguration.Tier1Regular]: 'A regular battery option for units with no energy-intensive tasks.',
    [BatteryConfiguration.Tier1Big]:
        'Use this option if your unit is going to perform tasks that require a lot of power (e.g. intensive mining).',
    [BatteryConfiguration.Tier2]: 'Should be enough to run a small town.',
};

const BATTERY_TIERS: Record<BatteryConfiguration, 1 | 2> = {
    [BatteryConfiguration.Tier1Small]: 1,
    [BatteryConfiguration.Tier1Regular]: 1,
    [BatteryConfiguration.Tier1Big]: 1,
    [BatteryConfiguration.Tier2]: 2,
};

const BADGE_CLS: Record<BatteryConfiguration | '', string> = {
    '': styles.badgeTier0,
    [BatteryConfiguration.Tier1Small]: styles.badgeTier1,
    [BatteryConfiguration.Tier1Regular]: styles.badgeTier1,
    [BatteryConfiguration.Tier1Big]: styles.badgeTier1,
    [BatteryConfiguration.Tier2]: styles.badgeTier2,
};

const CustomBatteryOption: Component<SelectCustomOptionProps<BatteryConfiguration | null>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.HalfFilledSquareLeft} class={BADGE_CLS[props.value ?? '']}>
                    {getBatteryCapacity({ battery: props.value ?? undefined }) / 1000 + 'K'}
                </Badge>
            }
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_BATTERY_DESCRIPTION : BATTERY_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};

export const BatteryUnitComponent: UnitComponent = {
    cls: styles.componentBattery,
    icon: Symbols.HalfFilledSquareLeft,
    name: 'Battery',
    description: ({ battery }) => (battery ? BATTERY_DESCRIPTIONS[battery] : NO_BATTERY_DESCRIPTION),
    initial: { battery: BatteryConfiguration.Tier1Small },
    remove: { battery: undefined },
    isolate: ({ battery }) => ({ battery }),
    isPresent: ({ battery }) => Boolean(battery),
    mode: 'required',
    getTier: ({ battery }) => (battery ? BATTERY_TIERS[battery] : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={BATTERY_OPTIONS}
                value={findValue(BATTERY_OPTIONS, props.config.battery)}
                onUpdate={(option) => {
                    props.onUpdate({ battery: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomBatteryOption}
            />
        );
    },
    warningsRenderer: (props) => {
        return (
            <Show
                when={!props.config.battery}
                fallback={
                    <Show when={!props.config.solar}>
                        <UnitComponentWarning
                            actions={
                                <Button onClick={() => props.onUpdate({ solar: SolarConfiguration.Tier1Cheap })}>
                                    Add Solar Panels
                                </Button>
                            }
                        >
                            No way to charge the battery! When it's out, it's out forever.
                        </UnitComponentWarning>
                    </Show>
                }
            >
                <UnitComponentWarning
                    actions={<Button onClick={() => props.onUpdate(BatteryUnitComponent.initial)}>Add Battery</Button>}
                >
                    {NO_BATTERY_DESCRIPTION}
                </UnitComponentWarning>
            </Show>
        );
    },
};
