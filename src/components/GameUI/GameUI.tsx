import { createSignal, onCleanup, onMount, Show, type ParentComponent } from 'solid-js';
import { createGame, type Game } from '@/game';
import { getCameraOrbitForCoords } from '@/game/camera';
import { DEFAULT_SCOUT_PRESET, MOTHER_PRESET, TEST_PRESET } from '@/game/presets';
import { spawnFromDeck } from '@/game/utils';
import { GameProvider } from '@/gameContext';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';
import { GameTopBar } from '../GameTopBar/GameTopBar';
import { SelectedTilePanel } from '../SelectedTilePanel/SelectedTilePanel';
import { SelectedUnitsPanel } from '../SelectedUnitsPanel/SelectedUnitsPanel';
import styles from './GameUI.module.css';

export const GameUI: ParentComponent = (props) => {
    const [game, setGame] = createSignal<Game | null>(null);
    const [loadingProgress, setLoadingProgress] = createSignal('0% Loading...');

    onMount(() => {
        createGame({
            worldgen: {
                seed: 'test1',
            },
            onProgress: ({ progress, stage }) => setLoadingProgress(`${(progress * 100).toFixed(0)}% ${stage}...`),
        }).then((g) => {
            const coreBp = g.deck.create('Core_Module', MOTHER_PRESET);
            const spawnLocation = g.world.spawnLocation;
            const coreId = spawnFromDeck(g.deck, g.units, spawnLocation, coreBp.id)!;
            g.units.inventory.add({ to: coreId, amounts: { titanium: 100, copper: 100, lithium: 100 }, tick: 0 });

            const { yaw, pitch } = getCameraOrbitForCoords(g.world.surface[spawnLocation].position);
            g.camera.setInstant({ yaw, pitch });

            g.deck.create('Simple_Scout', DEFAULT_SCOUT_PRESET);

            g.deck.create('Test', TEST_PRESET);

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
            </GameProvider>
        </Show>
    );
};
