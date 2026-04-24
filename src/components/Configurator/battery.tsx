import type { Component } from 'solid-js';
import { BatteryConfiguration, getBatteryCapacity } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const BATTERY_OPTIONS: SelectOption<BatteryConfiguration | null>[] = [
    { text: 'No battery', value: null },
    { text: 'Small accumulator', value: BatteryConfiguration.Tier1Small },
    { text: 'Regular power cell', value: BatteryConfiguration.Tier1Regular },
    { text: 'Large power cell', value: BatteryConfiguration.Tier1Big },
    { text: 'Advanced energy storage', value: BatteryConfiguration.Tier2 },
];

const NO_BATTERY_DESCRIPTION = 'WARNING! A battery is needed for almost every other module a unit can have!';
const BATTERY_DESCRIPTIONS: Record<BatteryConfiguration, string> = {
    [BatteryConfiguration.Tier1Small]: "A lightweight option for units that don't need much energy",
    [BatteryConfiguration.Tier1Regular]: 'A regular battery option for units with no energy-intensive tasks',
    [BatteryConfiguration.Tier1Big]:
        'Use this option if your unit is going to perform tasks that require a lot of power (e.g. intensive mining)',
    [BatteryConfiguration.Tier2]: 'Should be enough to run a small town',
};

const BADGE_CLS: Record<BatteryConfiguration | '', string> = {
    '': styles.badgeTier0,
    [BatteryConfiguration.Tier1Small]: styles.badgeTier1,
    [BatteryConfiguration.Tier1Regular]: styles.badgeTier1,
    [BatteryConfiguration.Tier1Big]: styles.badgeTier1,
    [BatteryConfiguration.Tier2]: styles.badgeTier2,
};

export const CustomBatteryOption: Component<SelectCustomOptionProps<BatteryConfiguration | null>> = (props) => {
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
