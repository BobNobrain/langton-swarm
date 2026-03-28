import { createSignal, onCleanup, onMount, type ParentComponent } from 'solid-js';
import { createGame, type NodeId, createDefaultUnitConfig, createMotherConfig } from '@/game';
import { spawnFromDeck } from '@/game/utils';
import { GameProvider } from '@/gameContext';
import { createGlobalListener, KeyCode } from '@/lib/input';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';
import { GameTopBar } from '../GameTopBar/GameTopBar';
import { SelectedTilePanel } from '../SelectedTilePanel/SelectedTilePanel';
import { SelectedUnitsPanel } from '../SelectedUnitsPanel/SelectedUnitsPanel';
import styles from './GameUI.module.css';

export const GameUI: ParentComponent = (props) => {
    const game = createGame({});
    onMount(() => {
        game.start();

        const core = game.deck.create('core', createMotherConfig());
        spawnFromDeck(game.deck, game.units, 15 as NodeId, core.id);

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
            <main class={styles.wrapper}>
                <section class={styles.scene}>{props.children}</section>
                <GameTopBar />
                <SelectedTilePanel />
                <SelectedUnitsPanel />
                <DeckBrowser />
            </main>
        </GameProvider>
    );
};
