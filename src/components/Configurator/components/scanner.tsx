import type { Component } from 'solid-js';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import styles from '../Configurator.module.css';

const SCANNER_OPTIONS: SelectOption<boolean>[] = [
    // { text: 'Disabled', value: false },
    { text: 'Enabled', value: true },
];

const NO_SCANNER_DESCRIPTION =
    "This unit won't be able to use scanner functions in its program and perform resource scans";
const YES_SCANNER_DESCRIPTION = 'A scanner will allow you to scan nearby places for ore deposits via program';

const CustomScannerOption: Component<SelectCustomOptionProps<boolean>> = (props) => {
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

export const ScannerUnitComponent: UnitComponent = {
    cls: styles.componentScanner,
    icon: Symbols.Circle,
    name: 'Scanner',
    description: ({ scanner }) => (scanner ? YES_SCANNER_DESCRIPTION : ''),
    initial: { scanner: true },
    remove: { scanner: undefined },
    isolate: ({ scanner }) => ({ scanner }),
    isPresent: ({ scanner }) => Boolean(scanner),
    getTier: ({ scanner }) => (scanner ? 1 : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={SCANNER_OPTIONS}
                value={findValue(SCANNER_OPTIONS, props.config.scanner)}
                onUpdate={(option) => {
                    props.onUpdate({ scanner: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomScannerOption}
            />
        );
    },
};
