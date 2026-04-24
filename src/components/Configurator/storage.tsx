import type { Component } from 'solid-js';
import { getStorageCapacity, StorageConfiguration } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const STORAGE_OPTIONS: SelectOption<StorageConfiguration | null>[] = [
    { text: 'No storage', value: null },
    { text: 'Tiny compartment', value: StorageConfiguration.Tier1Small },
    { text: 'Small storage', value: StorageConfiguration.Tier1Regular },
    { text: 'Medium storage', value: StorageConfiguration.Tier1Big },
    { text: 'Large warehouse', value: StorageConfiguration.Tier2Small },
    { text: 'Expansive warehouse', value: StorageConfiguration.Tier2Regular },
    { text: 'Ultimate warehouse', value: StorageConfiguration.Tier2Big },
];

const NO_STORAGE_DESCRIPTION = 'Pick this if your unit does not need to store items at all';
const STORAGE_DESCRIPTIONS: Record<StorageConfiguration, string> = {
    [StorageConfiguration.Tier1Small]: 'A tiny storage module with space for 10 items',
    [StorageConfiguration.Tier1Regular]: 'A small storage module with space for 35 items',
    [StorageConfiguration.Tier1Big]: 'A medium storage module that has space for 70 items',
    [StorageConfiguration.Tier2Small]: 'A large storage facility that can store up to 200 items',
    [StorageConfiguration.Tier2Regular]: 'An expansive storage facility capable of storing 1000 items',
    [StorageConfiguration.Tier2Big]: "Whatever you've got, it fits it. An ultimate storage for 10,000 items",
    [StorageConfiguration.Infinite]: '',
};

const BADGE_CLS: Record<StorageConfiguration | '', string> = {
    '': styles.badgeTier0,
    [StorageConfiguration.Tier1Small]: styles.badgeTier1,
    [StorageConfiguration.Tier1Regular]: styles.badgeTier1,
    [StorageConfiguration.Tier1Big]: styles.badgeTier1,
    [StorageConfiguration.Tier2Small]: styles.badgeTier2,
    [StorageConfiguration.Tier2Regular]: styles.badgeTier2,
    [StorageConfiguration.Tier2Big]: styles.badgeTier2,

    [StorageConfiguration.Infinite]: styles.badgeTier0,
};

export const CustomStorageOption: Component<SelectCustomOptionProps<StorageConfiguration | null>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.ParallelogramOutline} class={BADGE_CLS[props.value ?? '']}>
                    {getStorageCapacity({ storage: props.value ?? undefined })}
                </Badge>
            }
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_STORAGE_DESCRIPTION : STORAGE_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
