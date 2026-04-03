import { Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { KeyCode } from '@/lib/input';
import { Button } from '../Button/Button';
import styles from './GameTopBar.module.css';

export const GameTopBar: Component = () => {
    const { time } = useGame();
    return (
        <div class={styles.topBar}>
            <Button style="text" hotkey={{ key: KeyCode.Space }} onClick={time.togglePause}>
                <Show when={time.rIsPaused()} fallback="Pause">
                    Paused
                </Show>
            </Button>
        </div>
    );
};
