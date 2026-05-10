import { createSignal, onCleanup, onMount, Show, type ParentComponent } from 'solid-js';
import { createGame, type Game } from '@/game';
import { getCameraOrbitForCoords } from '@/game/camera';
import {
    AUTO_MINER_PRESET,
    DEFAULT_SCOUT_PRESET,
    MINING_RIG_PRESET,
    MOTHER_PRESET,
    SIMPLE_BUILDER_PRESET,
    TEST_PRESET,
} from '@/game/config/presets';
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
            const coreBp = g.playerDeck.create('Core_Module', MOTHER_PRESET);
            const spawnLocation = g.world.spawnLocation;
            const coreId = spawnFromDeck(g.playerDeck, g.units.spawn, spawnLocation, coreBp.id)!;
            g.units.inventory.add({
                to: coreId,
                amounts: { structural: 150, electrical: 150, energetical: 100 },
            });

            // cheats
            g.units.inventory.add({
                to: coreId,
                amounts: { structural: 1000, electrical: 1000, energetical: 1000 },
            });

            const { yaw, pitch } = getCameraOrbitForCoords(g.world.surface[spawnLocation].position);
            g.camera.setInstant({ yaw, pitch });

            g.playerDeck.create('Simple_Scout', DEFAULT_SCOUT_PRESET);
            g.playerDeck.create('Simple_Auto_Miner', AUTO_MINER_PRESET);
            g.playerDeck.create('Simple_Builder', SIMPLE_BUILDER_PRESET);
            g.playerDeck.create('Mining_Rig', MINING_RIG_PRESET);

            g.playerDeck.create('Test', TEST_PRESET);

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
