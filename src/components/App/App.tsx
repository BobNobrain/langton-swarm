import { onCleanup, onMount, type Component } from 'solid-js';
import { triggerResize } from '@/lib/BoundsTracker';
import { GameScene } from '@/three/GameScene/GameScene';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { GameUI } from '../GameUI/GameUI';

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

    return (
        <>
            <GameUI>
                <SceneRenderer clearColor="#000000">
                    <GameScene />
                </SceneRenderer>
            </GameUI>
        </>
    );
};

export default App;
