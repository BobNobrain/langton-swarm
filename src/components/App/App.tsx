import type { Component } from 'solid-js';
import { gameController } from '@/game';
import { GameScene } from '@/three/GameScene/GameScene';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { GameUI } from '../GameUI/GameUI';

gameController.createWorld('deadmouse');

const App: Component = () => {
    return (
        <>
            <SceneRenderer clearColor="#000000">
                <GameScene />
            </SceneRenderer>
            <GameUI />
        </>
    );
};

export default App;
