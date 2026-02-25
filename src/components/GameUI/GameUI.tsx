import { createSignal, onCleanup, onMount, type ParentComponent } from 'solid-js';
import { createGame } from '@/game';
import { GameProvider } from '@/gameContext';
import { GameControlPanel } from '../GameControlPanel/GameControlPanel';
import { GameUIContextProvider } from './context';
import styles from './GameUI.module.css';

export const GameUI: ParentComponent = (props) => {
    const [isExpanded, setIsExpanded] = createSignal(false);

    const game = createGame({});
    onMount(() => {
        game.start();

        game.deck.createBlueprint('roamer');
        game.deck.createBlueprint('miner');
        game.deck.createBlueprint('soldier');
        const bp = game.deck.createBlueprint('test');
        console.log(bp);

        const swarm = game.swarms.create('test', 0);

        for (let i = 0; i < 100; i++) {
            swarm.create(Math.floor(Math.random() * (game.world.planet()?.nodes.length ?? 0)));
        }

        onCleanup(() => {
            game.stop();
        });
    });

    return (
        <GameProvider value={game}>
            <GameUIContextProvider value={{ setIsExpanded }}>
                <main class={styles.wrapper}>
                    <section class={styles.scene}>{props.children}</section>
                    <aside
                        class={styles.ui}
                        classList={{
                            [styles.expanded]: isExpanded(),
                        }}
                    >
                        <GameControlPanel />
                    </aside>
                </main>
            </GameUIContextProvider>
        </GameProvider>
    );
};
