import type { Component } from 'solid-js';
import { GameScene } from '@/three/GameScene/GameScene';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { GameUI } from '../GameUI/GameUI';

const App: Component = () => {
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
