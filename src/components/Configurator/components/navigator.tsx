import { type Component } from 'solid-js';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import styles from '../Configurator.module.css';

const NAVIGATOR_OPTIONS: SelectOption<boolean>[] = [
    // { text: 'Disabled', value: false },
    { text: 'Enabled', value: true },
];

const NO_NAVIGATOR_DESCRIPTION = "Without a navigator, a unit won't be able to pathfind anywhere";
const YES_NAVIGATOR_DESCRIPTION =
    "A navigator allows you to use its functions in unit's program to perform pathfinding, remember it's spawn location, etc.";

const CustomNavigatorOption: Component<SelectCustomOptionProps<boolean>> = (props) => {
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

export const NavigatorUnitComponent: UnitComponent = {
    cls: styles.componentNavigator,
    icon: Symbols.SquareWhite,
    name: 'Navigator',
    description: ({ navigator }) => (navigator ? YES_NAVIGATOR_DESCRIPTION : ''),
    initial: { navigator: true },
    remove: { navigator: undefined },
    isolate: ({ navigator }) => ({ navigator }),
    isPresent: ({ navigator }) => Boolean(navigator),
    getTier: ({ navigator }) => (navigator ? 1 : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={NAVIGATOR_OPTIONS}
                value={findValue(NAVIGATOR_OPTIONS, props.config.navigator)}
                onUpdate={(option) => {
                    props.onUpdate({ navigator: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomNavigatorOption}
            />
        );
    },
};
