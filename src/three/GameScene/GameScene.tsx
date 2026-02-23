import type { Component } from 'solid-js';
import { PlanetMesh } from '../PlanetMesh/PlanetMesh';
import { gameState } from '@/game';
import { AmbientLight } from '../AmbientLight/AmbientLight';
import { DirectionalLight } from '../DirectionalLight/DirectionalLight';
import { PerspectiveCamera } from '../PerspectiveCamera/PerspectiveCamera';
import { Vector3 } from 'three';

export const GameScene: Component = () => {
    return (
        <>
            <PlanetMesh planetNodes={gameState.world()?.nodes ?? []} />
            <AmbientLight color="#aaccff" intensity={0.2} />
            <DirectionalLight color="#fff8dd" intensity={0.8} positionX={0} positionY={2} positionZ={2} />
            <PerspectiveCamera
                fov={75}
                far={10}
                near={0.1}
                positionX={-2}
                positionY={0}
                positionZ={0}
                main
                lookAt={new Vector3(0, 0, 0)}
            />
        </>
    );
};
