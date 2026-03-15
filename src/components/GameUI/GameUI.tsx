import { createSignal, onCleanup, onMount, type ParentComponent } from 'solid-js';
import { createGame } from '@/game';
import { GameProvider } from '@/gameContext';
import { createGlobalListener, KeyCode } from '@/lib/input';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { GameTopBar } from '../GameTopBar/GameTopBar';
import { SelectedTilePanel } from '../SelectedTilePanel/SelectedTilePanel';
import { SelectedUnitsPanel } from '../SelectedUnitsPanel/SelectedUnitsPanel';
import { GameUIContextProvider } from './context';
import styles from './GameUI.module.css';

export const GameUI: ParentComponent = (props) => {
    const [isExpanded, setIsExpanded] = createSignal(false);

    const game = createGame({});
    onMount(() => {
        game.start();

        const bp = game.deck.create('test');

        for (let i = 0; i < 100; i++) {
            game.swarms.spawn({
                blueprint: bp.id,
                version: bp.rLastVersion().version,
                position: Math.floor(Math.random() * (game.world.planet()?.nodes.length ?? 0)),
            });
        }

        onCleanup(() => {
            game.stop();
        });
    });

    createGlobalListener('keyup', (ev) => {
        if (ev.code !== KeyCode.Space) {
            return;
        }

        game.time.togglePause();
    });

    return (
        <GameProvider value={game}>
            <GameUIContextProvider value={{ setIsExpanded }}>
                <main class={styles.wrapper}>
                    <section class={styles.scene}>{props.children}</section>
                    <GameTopBar />
                    <SelectedTilePanel />
                    <SelectedUnitsPanel />
                    <FloatingPanel pinRight pinBottom pinTop expandedWidth={isExpanded()}>
                        <DeckBrowser />
                    </FloatingPanel>
                </main>
            </GameUIContextProvider>
        </GameProvider>
    );
};
