import type { Component } from 'solid-js';
import { AssemblerConfiguration, getAssemblerSpeed } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { ListItem } from '../List/List';
import type { SelectCustomOptionProps, SelectOption } from '../Select/Select';
import styles from './Configurator.module.css';

export const ASSEMBLER_OPTIONS: SelectOption<AssemblerConfiguration | null>[] = [
    { text: 'None', value: null },
    { text: 'Crude assembler', value: AssemblerConfiguration.Tier1 },
    { text: 'Advanced assembler', value: AssemblerConfiguration.Tier2 },
];

const NO_ASSEMBLER_DESCRIPTION = 'Without an assembler module, the unit will not be capable of building other units';
const ASSEMBLER_DESCRIPTIONS: Record<AssemblerConfiguration, string> = {
    [AssemblerConfiguration.Tier1]: 'A simple mechanized device capable of creating more units – albeit not very quick',
    [AssemblerConfiguration.Tier2]:
        'This assembler provides a state-of-the art speed when constructing more units, but it comes with a MASSIVE downside',
};

const BADGE_CLS: Record<AssemblerConfiguration | '', string> = {
    '': styles.badgeTier0,
    [AssemblerConfiguration.Tier1]: styles.badgeTier1,
    [AssemblerConfiguration.Tier2]: styles.badgeTier2,
};

export const CustomAssemblerOption: Component<SelectCustomOptionProps<AssemblerConfiguration | null>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.DottedCircle} class={BADGE_CLS[props.value ?? '']}>
                    {getAssemblerSpeed({ assembler: props.value ?? undefined }) * 100 + '%'}
                </Badge>
            }
            bottom={
                <div class={styles.optionDescription}>
                    {props.value === null ? NO_ASSEMBLER_DESCRIPTION : ASSEMBLER_DESCRIPTIONS[props.value]}
                </div>
            }
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};
