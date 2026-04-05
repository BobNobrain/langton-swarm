import { createEffect, onCleanup } from 'solid-js';
import type { GameCamera } from '@/game/camera';
import { useSceneRenderer } from '../context';

export function createCameraWheelControls(camera: GameCamera) {
    const { canvas } = useSceneRenderer();

    createEffect(() => {
        const el = canvas();
        const onWheel = (ev: WheelEvent) => {
            const dir = Math.sign(ev.deltaY);
            let distanceFactor = 1;
            if (dir > 0) {
                distanceFactor = 1.1;
            } else {
                distanceFactor = 1 / 1.1;
            }
            camera.updateManual({ distanceFactor });
        };

        el.addEventListener('wheel', onWheel);
        onCleanup(() => {
            el.removeEventListener('wheel', onWheel);
        });
    });
}
