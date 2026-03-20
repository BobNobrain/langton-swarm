import { createSignal, onCleanup, onMount, type ParentComponent } from 'solid-js';
import { createGame } from '@/game';
import { createMotherConfig } from '@/game/mother';
import { GameProvider } from '@/gameContext';
import { createGlobalListener, KeyCode } from '@/lib/input';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { GameTopBar } from '../GameTopBar/GameTopBar';
import { SelectedTilePanel } from '../SelectedTilePanel/SelectedTilePanel';
import { SelectedUnitsPanel } from '../SelectedUnitsPanel/SelectedUnitsPanel';
import { GameUIContextProvider } from './context';
import styles from './GameUI.module.css';
import { createDefaultUnitConfig } from '@/game/config';

export const GameUI: ParentComponent = (props) => {
    const [isExpanded, setIsExpanded] = createSignal(false);

    const game = createGame({});
    onMount(() => {
        game.start();

        const core = game.deck.create('core', createMotherConfig(game.swarms, game.deck));
        game.swarms.spawn({
            blueprint: core.id,
            version: core.rLastVersion().version,
            position: 15,
        });

        const testBp = game.deck.create('test', createDefaultUnitConfig());

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
