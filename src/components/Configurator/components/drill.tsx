import { Show, type Component } from 'solid-js';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { DrillConfiguration, getDrillProperties, StorageConfiguration } from '@/game/config';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import { UnitComponentWarning } from './warning';
import styles from '../Configurator.module.css';

const DRILL_OPTIONS: SelectOption<DrillConfiguration>[] = [
    { text: 'Collector', value: DrillConfiguration.Tier1 },
    { text: 'Heavy drill', value: DrillConfiguration.Tier2 },
];

const DRILL_DESCRIPTIONS: Record<DrillConfiguration, string> = {
    [DrillConfiguration.Tier1]: 'A simple option that is enough to collect loose ores from the surface.',
    [DrillConfiguration.Tier2]:
        'An intricate and heavy drilling machinery, for those not afraid of drilling too greedily and too deep.',
};

const BADGE_CLS: Record<DrillConfiguration, string> = {
    [DrillConfiguration.Tier1]: styles.badgeTier1,
    [DrillConfiguration.Tier2]: styles.badgeTier2,
};

const DRILL_TIERS: Record<DrillConfiguration, 1 | 2> = {
    [DrillConfiguration.Tier1]: 1,
    [DrillConfiguration.Tier2]: 2,
};

const CustomDrillOption: Component<SelectCustomOptionProps<DrillConfiguration>> = (props) => {
    const { gameTick } = useGame();

    const getMiningSpeed = () => {
        const { miningAmount, miningTime } = getDrillProperties({ drill: props.value });
        const amtPerS = (miningAmount / (miningTime * gameTick.tickDurationMs)) * 1000;
        return `${amtPerS.toFixed(1)}/s`;
    };

    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.ParallelogramOutline} class={BADGE_CLS[props.value]}>
                    {getMiningSpeed()}
                </Badge>
            }
            bottom={<div class={styles.optionDescription}>{DRILL_DESCRIPTIONS[props.value]}</div>}
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};

export const DrillUnitComponent: UnitComponent = {
    cls: styles.componentDrill,
    icon: Symbols.TriangleDown,
    name: 'Drill',
    description: ({ drill }) => (drill ? DRILL_DESCRIPTIONS[drill] : ''),
    initial: { drill: DrillConfiguration.Tier1 },
    remove: { drill: undefined },
    isolate: ({ drill }) => ({ drill }),
    isPresent: ({ drill }) => Boolean(drill),
    getTier: ({ drill }) => (drill ? DRILL_TIERS[drill] : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={DRILL_OPTIONS}
                value={findValue(DRILL_OPTIONS, props.config.drill)}
                onUpdate={(option) => {
                    props.onUpdate({ drill: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomDrillOption}
            />
        );
    },
    warningsRenderer: (props) => {
        return (
            <Show when={!props.config.storage}>
                <UnitComponentWarning
                    actions={
                        <Button onClick={() => props.onUpdate({ storage: StorageConfiguration.Tier1Regular })}>
                            Add storage
                        </Button>
                    }
                >
                    No storage added – all mined resources will be dropped on the floor!
                </UnitComponentWarning>
            </Show>
        );
    },
};
