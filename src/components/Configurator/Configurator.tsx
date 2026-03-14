import type { Component } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import { Toggle } from '../Toggle/Toggle';
import styles from './Configurator.module.css';

export const Configurator: Component<{
    value: UnitConfiguration | null;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
}> = (props) => {
    return (
        <div class={styles.configurator}>
            <Toggle
                value={props.value?.navigator ?? true}
                onUpdate={(value) => props.onUpdate({ navigator: value })}
                label="Navigator"
            />
            <Toggle
                value={props.value?.navigator ?? true}
                onUpdate={(value) => props.onUpdate({ navigator: value })}
                label="Drill"
            />
            <Toggle
                value={props.value?.receiver ?? true}
                onUpdate={(value) => props.onUpdate({ receiver: value })}
                label="Receiver"
            />
            <Toggle
                value={props.value?.scanner ?? true}
                onUpdate={(value) => props.onUpdate({ scanner: value })}
                label="Scanner"
            />
        </div>
    );
};
