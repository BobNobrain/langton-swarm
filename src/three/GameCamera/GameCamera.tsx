import { type Component, createEffect, onCleanup, onMount } from 'solid-js';
import { PerspectiveCamera, Vector3 } from 'three';
import { useGame } from '@/gameContext';
import { useSceneRenderer } from '../context';
import { onBeforeRepaint } from '../hooks/handlers';
import { createCameraDragControls } from './drag';
import { createCameraKeyboardControls } from './keyboard';
import { createCameraWheelControls } from './wheel';

export type GameCameraProps = {
    ref?: (cam: PerspectiveCamera) => void;

    fov?: number;
    near?: number;
    far?: number;
};

export const GameCamera: Component<GameCameraProps> = (props) => {
    const { getBounds, setMainCamera } = useSceneRenderer();
    const cam = new PerspectiveCamera(props.fov, 1, props.near, props.far);
    const looksAt = new Vector3(0, 0, 0);

    const { camera: cameraState } = useGame();

    createCameraKeyboardControls(cameraState);
    createCameraWheelControls(cameraState);
    createCameraDragControls(cameraState);

    onBeforeRepaint(({ t }) => {
        const { pitch, yaw, distance } = cameraState.getOrbit(t);
        cam.position.setFromSphericalCoords(distance, pitch, yaw).add(looksAt);
        cam.lookAt(looksAt);
    });

    onMount(() => {
        setMainCamera(cam);
        onCleanup(() => setMainCamera(null));
    });

    createEffect(() => {
        const { width, height } = getBounds(); // register this effect to happen when canvas is resized
        cam.aspect = width / height;
        cam.updateProjectionMatrix();
    });

    props.ref?.(cam);
    return null;
};
