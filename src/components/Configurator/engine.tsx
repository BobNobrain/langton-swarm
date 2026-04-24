import type { Component } from 'solid-js';
import { EngineConfiguration } from '@/game/config';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const ENGINE_OPTIONS: SelectOption<EngineConfiguration | null>[] = [
    { text: 'None', value: null },
    { text: 'Crude servomotor', value: EngineConfiguration.Tier1Cheap },
    { text: 'Electric engine', value: EngineConfiguration.Tier1Regular },
    { text: 'Advanced engine', value: EngineConfiguration.Tier2 },
];

const NO_ENGINE_DESCRIPTION = "This unit will have no engine, and thus won't be able to move";
const ENGINE_DESCRIPTIONS: Record<EngineConfiguration, string> = {
    [EngineConfiguration.Tier1Cheap]: 'A cheap but effective engine',
    [EngineConfiguration.Tier1Regular]: 'A more expensive engine that can move heavier units faster',
    [EngineConfiguration.Tier2]: 'The most powerful engine that can be put on a unit',
};

export const CustomEngineOption: Component<SelectCustomOptionProps<EngineConfiguration | null>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_ENGINE_DESCRIPTION : ENGINE_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
