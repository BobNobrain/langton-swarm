import { createSignal, onCleanup, onMount, Show, type ParentComponent } from 'solid-js';
import { createGame, type Game } from '@/game';
import { setupNewGame } from '@/game/setup';
import { GameProvider } from '@/gameContext';
import { getGameOptions } from '@/gameOptions';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';
import { GameTopBar } from '../GameTopBar/GameTopBar';
import { SavingBanner } from '../SavingBanner/SavingBanner';
import { SelectedTilePanel } from '../SelectedTilePanel/SelectedTilePanel';
import { SelectedUnitsPanel } from '../SelectedUnitsPanel/SelectedUnitsPanel';
import styles from './GameUI.module.css';

export const GameUI: ParentComponent = (props) => {
    const [game, setGame] = createSignal<Game | null>(null);
    const [loadingProgress, setLoadingProgress] = createSignal('0% Loading...');

    onMount(() => {
        createGame({
            ...getGameOptions(),
            onProgress: ({ progress, stage }) => setLoadingProgress(`${(progress * 100).toFixed(0)}% ${stage}...`),
        }).then((g) => {
            if (!getGameOptions().save) {
                setupNewGame(g);
            }

            setGame(g);
            g.start();
        });

        onCleanup(() => {
            game()?.stop();
        });
    });

    return (
        <Show
            when={game()}
            fallback={
                <div class={styles.loadingWrapper}>
                    <div class={styles.loading}>{loadingProgress()}</div>
                </div>
            }
        >
            <GameProvider value={game()!}>
                <main class={styles.wrapper}>
                    <section class={styles.scene}>{props.children}</section>
                    <GameTopBar />
                    <SelectedTilePanel />
                    <SelectedUnitsPanel />
                    <DeckBrowser />
                </main>
                <SavingBanner />
            </GameProvider>
        </Show>
    );
};
