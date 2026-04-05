import { createEffect, onCleanup } from 'solid-js';
import type { GameCamera } from '@/game/camera';
import { createDragTracker } from '@/lib/drag';
import { MouseButton } from '@/lib/input';
import { useSceneRenderer } from '../context';

const YAW_SPEED = Math.PI / 5000;
const PITCH_SPEED = Math.PI / 4000;

export function createCameraDragControls(camera: GameCamera) {
    const { canvas } = useSceneRenderer();

    const { handlers } = createDragTracker({
        button: MouseButton.Wheel,
        onDrag(ev) {
            camera.updateManual({ deltaYaw: -ev.last.x * YAW_SPEED, deltaPitch: -ev.last.y * PITCH_SPEED });
        },
    });

    createEffect(() => {
        const el = canvas();

        el.addEventListener('mousedown', handlers.onMouseDown);
        el.addEventListener('mouseup', handlers.onMouseUp);

        onCleanup(() => {
            el.removeEventListener('mousedown', handlers.onMouseDown);
            el.removeEventListener('mouseup', handlers.onMouseUp);
        });
    });
}
