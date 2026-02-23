import type { Component } from 'solid-js';
import { gameState } from '@/game';
import { GameCamera } from '../GameCamera/GameCamera';
import { PlanetMesh } from '../PlanetMesh/PlanetMesh';
import { GameGlobalLight } from '../GameGlobalLight/GameGlobalLight';
import { GameBots } from '../GameBots/GameBots';

export const GameScene: Component = () => {
    return (
        <>
            <PlanetMesh planetNodes={gameState.world()?.nodes ?? []} />
            <GameBots />
            <GameGlobalLight />
            <GameCamera fov={75} far={10} near={0.1} />
        </>
    );
};
