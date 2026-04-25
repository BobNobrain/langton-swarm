import type { Component } from 'solid-js';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const NAVIGATOR_OPTIONS: SelectOption<boolean>[] = [
    { text: 'Disabled', value: false },
    { text: 'Enabled', value: true },
];

const NO_NAVIGATOR_DESCRIPTION = "Without a navigator, a unit won't be able to pathfind anywhere";
const YES_NAVIGATOR_DESCRIPTION =
    "A navigator allows you to use its functions in unit's program to perform pathfinding, remember it's spawn location, etc.";

export const CustomNavigatorOption: Component<SelectCustomOptionProps<boolean>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            bottom={
                <div class={styles.optionDescription}>
                    {props.value ? YES_NAVIGATOR_DESCRIPTION : NO_NAVIGATOR_DESCRIPTION}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
