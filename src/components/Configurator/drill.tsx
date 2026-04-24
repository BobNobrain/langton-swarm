import type { Component } from 'solid-js';
import { DrillConfiguration, getDrillProperties } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';
import { useGame } from '@/gameContext';

export const DRILL_OPTIONS: SelectOption<DrillConfiguration | null>[] = [
    { text: 'None', value: null },
    { text: 'Collector', value: DrillConfiguration.Tier1 },
    { text: 'Heavy drill', value: DrillConfiguration.Tier2 },
];

const NO_DRILL_DESCRIPTION = 'Unit will not be able to mine resources';
const DRILL_DESCRIPTIONS: Record<DrillConfiguration, string> = {
    [DrillConfiguration.Tier1]: 'A simple option that is enough to collect loose ores from the surface',
    [DrillConfiguration.Tier2]:
        'An intricate and heavy drilling machinery, for those not afraid of drilling too greedily and too deep',
};

const BADGE_CLS: Record<DrillConfiguration | '', string> = {
    '': styles.badgeTier0,
    [DrillConfiguration.Tier1]: styles.badgeTier1,
    [DrillConfiguration.Tier2]: styles.badgeTier2,
};

export const CustomDrillOption: Component<SelectCustomOptionProps<DrillConfiguration | null>> = (props) => {
    const { gameTick } = useGame();

    const getMiningSpeed = () => {
        const { miningAmount, miningTime } = getDrillProperties({ drill: props.value ?? undefined });
        const amtPerS = (miningAmount / (miningTime * gameTick.tickDurationMs)) * 1000;
        return `${amtPerS.toFixed(1)}/s`;
    };

    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.ParallelogramOutline} class={BADGE_CLS[props.value ?? '']}>
                    {getMiningSpeed()}
                </Badge>
            }
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_DRILL_DESCRIPTION : DRILL_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
