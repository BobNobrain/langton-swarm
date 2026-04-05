import { createEffect, onCleanup } from 'solid-js';
import type { GameCamera } from '@/game/camera';
import { useSceneRenderer } from '../context';

const WHEEL_SENSITIVITY = 0.001;

export function createCameraWheelControls(camera: GameCamera) {
    const { canvas } = useSceneRenderer();

    createEffect(() => {
        const el = canvas();
        const onWheel = (ev: WheelEvent) => {
            const d = ev.deltaY * WHEEL_SENSITIVITY;
            camera.updateManual({ deltaDistance: d });
        };

        el.addEventListener('wheel', onWheel);
        onCleanup(() => {
            el.removeEventListener('wheel', onWheel);
        });
    });
}
