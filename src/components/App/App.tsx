import { createSignal, onCleanup, onMount, Show, type Component } from 'solid-js';
import { triggerResize } from '@/lib/BoundsTracker';
import { GameScene } from '@/three/GameScene/GameScene';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { GameUI } from '../GameUI/GameUI';
import { setGameOptions } from '@/gameOptions';
import { MainMenu } from '../MainMenu/MainMenu';
import { AppContextProvider, createAppState } from '@/appContext';

type Scene = 'menu' | 'game';

const App: Component = () => {
    onMount(() => {
        const handler = () => {
            triggerResize();
        };
        document.body.addEventListener('animationend', handler);
        document.body.addEventListener('transitionend', handler);

        onCleanup(() => {
            document.body.removeEventListener('animationend', handler);
            document.body.removeEventListener('transitionend', handler);
        });
    });

    const searchParams = new URLSearchParams(document.location.search);
    const getInt = (name: string): number | undefined => {
        const str = searchParams.get(name);
        if (!str) {
            return undefined;
        }
        const n = Number(str);
        if (Number.isNaN(n) || !Number.isFinite(n)) {
            return undefined;
        }
        if (!Number.isInteger(n)) {
            return Math.round(n);
        }
        return n;
    };

    setGameOptions({
        tickTime: getInt('ticktime'),
        worldgen: {
            seed: searchParams.get('seed') ?? 'test1',
            maxElevation: getInt('maxelev'),
            minSplats: getInt('minsplats'),
            maxSplats: getInt('maxsplats'),
        },
    });

    const appState = createAppState({
        defaultScene: searchParams.get('scene') === 'game' ? 'game' : 'menu',
    });

    return (
        <AppContextProvider value={appState}>
            <Show when={appState.rScene() === 'game'} fallback={<MainMenu />}>
                <GameUI>
                    <SceneRenderer clearColor="#000000">
                        <GameScene />
                    </SceneRenderer>
                </GameUI>
            </Show>
        </AppContextProvider>
    );
};

export default App;
