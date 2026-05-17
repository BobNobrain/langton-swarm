import { Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { EngineConfiguration } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import { UnitComponentWarning } from './warning';
import styles from '../Configurator.module.css';

const ENGINE_OPTIONS: SelectOption<EngineConfiguration | null>[] = [
    { text: 'None', value: null },
    { text: 'Crude servomotor', value: EngineConfiguration.Tier1Cheap },
    { text: 'Electric engine', value: EngineConfiguration.Tier1Regular },
    { text: 'Advanced engine', value: EngineConfiguration.Tier2 },
];

const NO_ENGINE_DESCRIPTION = "This unit will have no engine, and thus won't be able to move.";
const ENGINE_DESCRIPTIONS: Record<EngineConfiguration, string> = {
    [EngineConfiguration.Tier1Cheap]: 'A cheap but effective engine.',
    [EngineConfiguration.Tier1Regular]: 'A more expensive engine that can move heavier units faster.',
    [EngineConfiguration.Tier2]: 'The most powerful engine that can be put on a unit.',
};

const ENGINE_TIERS: Record<EngineConfiguration, 1 | 2> = {
    [EngineConfiguration.Tier1Cheap]: 1,
    [EngineConfiguration.Tier1Regular]: 1,
    [EngineConfiguration.Tier2]: 2,
};

const CustomEngineOption: Component<SelectCustomOptionProps<EngineConfiguration | null>> = (props) => {
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

export const EngineUnitComponent: UnitComponent = {
    cls: styles.componentEngine,
    icon: Symbols.DiamondOutlined,
    name: 'Engine',
    description: ({ engine }) => (engine ? ENGINE_DESCRIPTIONS[engine] : ''),
    initial: { engine: EngineConfiguration.Tier1Cheap, navigator: true },
    remove: { engine: undefined },
    isolate: ({ engine }) => ({ engine }),
    isPresent: ({ engine }) => Boolean(engine),
    mode: 'persistent',
    getTier: ({ engine }) => (engine ? ENGINE_TIERS[engine] : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={ENGINE_OPTIONS}
                value={findValue(ENGINE_OPTIONS, props.config.engine)}
                onUpdate={(option) => {
                    props.onUpdate({ engine: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomEngineOption}
            />
        );
    },
    warningsRenderer: (props) => {
        return (
            <Show
                when={!props.config.engine}
                fallback={
                    <Show when={!props.config.navigator}>
                        <UnitComponentWarning
                            actions={<Button onClick={() => props.onUpdate({ navigator: true })}>Add Navigator</Button>}
                        >
                            No navigator – only very basic movement is possible.
                        </UnitComponentWarning>
                    </Show>
                }
            >
                <UnitComponentWarning
                    style="info"
                    actions={<Button onClick={() => props.onUpdate(EngineUnitComponent.initial)}>Add Engine</Button>}
                >
                    Unable to move – no engine is added.
                </UnitComponentWarning>
            </Show>
        );
    },
};
