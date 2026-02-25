import { type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { GameSwarms } from '../GameSwarms/GameSwarms';
import { GameCamera } from '../GameCamera/GameCamera';
import { GameGlobalLight } from '../GameGlobalLight/GameGlobalLight';
import { PlanetMesh } from '../PlanetMesh/PlanetMesh';

export const GameScene: Component = () => {
    const game = useGame();

    return (
        <>
            <PlanetMesh planetNodes={game.world.planet()?.nodes ?? []} />
            <GameSwarms />
            <GameGlobalLight />
            <GameCamera fov={75} far={10} near={0.1} />
        </>
    );
};
