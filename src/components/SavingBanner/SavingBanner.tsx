import { Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import styles from './SavingBanner.module.css';

export const SavingBanner: Component = () => {
    const { saver } = useGame();

    return (
        <Show when={saver.rIsSaving()}>
            <aside class={styles.banner}>
                <div class={styles.content}>Saving the game...</div>
            </aside>
        </Show>
    );
};
