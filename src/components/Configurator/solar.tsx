import type { Component } from 'solid-js';
import { getMaxSolarPower, SolarConfiguration } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const SOLAR_OPTIONS: SelectOption<SolarConfiguration | null>[] = [
    { text: 'None', value: null },
    { text: 'Crude photoelements', value: SolarConfiguration.Tier1Cheap },
    { text: 'Simple solar panel', value: SolarConfiguration.Tier1Regular },
    { text: 'Large solar array', value: SolarConfiguration.Tier2Mobile },
    { text: 'Solar power plant', value: SolarConfiguration.Tier2Static },
];

const NO_SOLAR_DESCRIPTION = 'This unit will not recharge its batteries using the sun';
const SOLAR_DESCRIPTIONS: Record<SolarConfiguration, string> = {
    [SolarConfiguration.Tier1Cheap]: 'A cheap but viable option for units with low energy consumption',
    [SolarConfiguration.Tier1Regular]: 'A reliable source of energy – when the weather permits it',
    [SolarConfiguration.Tier2Mobile]: 'A big array of solar panels that will cover most of your needs',
    [SolarConfiguration.Tier2Static]:
        'A solar array so big that it will satisfy the hungries unit – at the cost of being very massive',
};

const BADGE_CLS: Record<SolarConfiguration | '', string> = {
    '': styles.badgeTier0,
    [SolarConfiguration.Tier1Cheap]: styles.badgeTier1,
    [SolarConfiguration.Tier1Regular]: styles.badgeTier1,
    [SolarConfiguration.Tier2Mobile]: styles.badgeTier2,
    [SolarConfiguration.Tier2Static]: styles.badgeTier2,
};

export const CustomSolarOption: Component<SelectCustomOptionProps<SolarConfiguration | null>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.LightShade} class={BADGE_CLS[props.value ?? '']}>
                    {getMaxSolarPower({ solar: props.value ?? undefined })}
                </Badge>
            }
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_SOLAR_DESCRIPTION : SOLAR_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
