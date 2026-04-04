import type { Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import styles from './TimeLabel.module.css';

export const TimeLabel: Component<{ ticks: number | null }> = (props) => {
    const { gameTick } = useGame();
    return (
        <span class={styles.label}>
            {Symbols.CircleQuarterTopRight}{' '}
            {props.ticks === null
                ? '--'
                : (Math.round((props.ticks * gameTick.tickDurationMs) / 100) / 10).toFixed(1) + 's'}
        </span>
    );
};
