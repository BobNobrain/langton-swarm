import { createSignal, Show, type Component } from 'solid-js';
import styles from './GameControlPanel.module.css';
import { WorldBrowser } from '../WorldBrowser/WorldBrowser';
import { DeckBrowser } from '../DeckBrowser/DeckBrowser';

type Tab = 'world' | 'deck' | 'bots';

export const GameControlPanel: Component = () => {
    const [getTab, setTab] = createSignal<Tab>('world');

    return (
        <div class={styles.panel}>
            <div class={styles.tabList}>
                <button
                    class={styles.tab}
                    classList={{ [styles.active]: getTab() === 'world' }}
                    onClick={() => setTab('world')}
                >
                    World
                </button>
                <button
                    class={styles.tab}
                    classList={{ [styles.active]: getTab() === 'deck' }}
                    onClick={() => setTab('deck')}
                >
                    Deck
                </button>
                <button
                    class={styles.tab}
                    classList={{ [styles.active]: getTab() === 'bots' }}
                    onClick={() => setTab('bots')}
                >
                    Bots
                </button>
            </div>

            <div class={styles.content}>
                <Show when={getTab() === 'world'}>
                    <WorldBrowser />
                </Show>
                <Show when={getTab() === 'deck'}>
                    <DeckBrowser />
                </Show>
                <Show when={getTab() === 'bots'}>Bot browser</Show>
            </div>
        </div>
    );
};
