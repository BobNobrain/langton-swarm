import type { Component } from 'solid-js';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const SCANNER_OPTIONS: SelectOption<boolean>[] = [
    { text: 'Disabled', value: false },
    { text: 'Enabled', value: true },
];

const NO_SCANNER_DESCRIPTION =
    "This unit won't be able to use scanner functions in its program and perform resource scans";
const YES_SCANNER_DESCRIPTION = 'A scanner will allow you to scan nearby places for ore deposits via program';

export const CustomScannerOption: Component<SelectCustomOptionProps<boolean>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            bottom={
                <div class={styles.optionDescription}>
                    {props.value ? YES_SCANNER_DESCRIPTION : NO_SCANNER_DESCRIPTION}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
