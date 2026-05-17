import type { Component } from 'solid-js';
import { Badge } from '@/components/Badge/Badge';
import { ListItem } from '@/components/List/List';
import { Select, type SelectCustomOptionProps, type SelectOption } from '@/components/Select/Select';
import { AssemblerConfiguration, getAssemblerSpeed } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import type { UnitComponent } from './types';
import { findValue } from './utils';
import styles from '../Configurator.module.css';

const ASSEMBLER_OPTIONS: SelectOption<AssemblerConfiguration>[] = [
    // { text: 'None', value: null },
    { text: 'Crude assembler', value: AssemblerConfiguration.Tier1 },
    { text: 'Advanced assembler', value: AssemblerConfiguration.Tier2 },
];

// const NO_ASSEMBLER_DESCRIPTION = 'Without an assembler module, the unit will not be capable of building other units';
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

const ASSEMBLER_TIERS: Record<AssemblerConfiguration, 1 | 2> = {
    [AssemblerConfiguration.Tier1]: 1,
    [AssemblerConfiguration.Tier2]: 2,
};

const CustomAssemblerOption: Component<SelectCustomOptionProps<AssemblerConfiguration>> = (props) => {
    return (
        <ListItem
            selected={props.selected}
            onClick={props.onClick}
            right={
                <Badge style="solid" icon={Symbols.DottedCircle} class={BADGE_CLS[props.value ?? '']}>
                    {getAssemblerSpeed({ assembler: props.value ?? undefined }) * 100 + '%'}
                </Badge>
            }
            bottom={<div class={styles.optionDescription}>{ASSEMBLER_DESCRIPTIONS[props.value]}</div>}
        >
            <span class={styles.optionName}>{props.text}</span>
        </ListItem>
    );
};

export const AssemblerUnitComponent: UnitComponent = {
    cls: styles.componentAssembler,
    icon: Symbols.DiamondWhite,
    name: 'Assembler',
    description: ({ assembler }) => (assembler ? ASSEMBLER_DESCRIPTIONS[assembler] : ''),
    initial: { assembler: AssemblerConfiguration.Tier1 },
    remove: { assembler: undefined },
    isolate: ({ assembler }) => ({ assembler }),
    isPresent: ({ assembler }) => Boolean(assembler),
    getTier: ({ assembler }) => (assembler ? ASSEMBLER_TIERS[assembler] : 0),
    inputRenderer: (props) => {
        return (
            <Select
                options={ASSEMBLER_OPTIONS}
                value={findValue(ASSEMBLER_OPTIONS, props.config.assembler)}
                onUpdate={(option) => {
                    props.onUpdate({ assembler: option.value ?? undefined });
                }}
                popupOpening="manual"
                dark
                sidewaySwitchable
                customOption={CustomAssemblerOption}
            />
        );
    },
};
