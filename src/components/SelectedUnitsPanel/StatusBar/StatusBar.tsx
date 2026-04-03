import type { Component } from 'solid-js';
import type { UnitId } from '@/game';
import styles from './StatusBar.module.css';
import { createUnitTracker } from '@/hooks/trackers';
import { renderEnergy, renderHealth, renderTileId } from '@/game/utils';

export const StatusBar: Component<{ unitId: UnitId | null }> = (props) => {
    const { rEnergy, rHealth, rLocation, rStateName } = createUnitTracker(() => props.unitId);

    return (
        <div class={styles.statusbar}>
            <span class={styles.label} classList={{ [styles.danger]: rHealth() < 0.25 }} title="Health">
                {renderHealth(rHealth())}
            </span>
            <span class={styles.label} classList={{ [styles.danger]: rEnergy() < 0.25 }} title="Energy">
                {renderEnergy(rEnergy())}
            </span>
            <span class={styles.label} title="Location">
                {renderTileId(rLocation())}
            </span>
            <span class={styles.label} classList={{ [styles.danger]: rStateName() === 'error' }} title="CPU state">
                {rStateName()}
            </span>
        </div>
    );
};
