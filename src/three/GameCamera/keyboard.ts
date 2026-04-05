import type { GameCamera } from '@/game/camera';
import { createHotkey } from '@/lib/hotkey';
import { KeyCode } from '@/lib/input';
import { onBeforeRepaint } from '../hooks/handlers';

const YAW_SPEED = Math.PI / 5000;
const PITCH_SPEED = Math.PI / 4000;

export function createCameraKeyboardControls(camera: GameCamera) {
    const pressedSince = {
        left: -1,
        right: -1,
        up: -1,
        down: -1,
    };

    const onLeftPressed = (ev: KeyboardEvent) => {
        pressedSince.left = performance.now();
    };
    const onRightPressed = (ev: KeyboardEvent) => {
        pressedSince.right = performance.now();
    };
    const onUpPressed = (ev: KeyboardEvent) => {
        pressedSince.up = performance.now();
    };
    const onDownPressed = (ev: KeyboardEvent) => {
        pressedSince.down = performance.now();
    };

    const onLeftReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.left === -1 ? 0 : performance.now() - pressedSince.left;
        pressedSince.left = -1;

        if (dtMs >= 0) {
            camera.updateManual({ deltaYaw: -dtMs * YAW_SPEED });
        }
    };
    const onRightReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.right === -1 ? 0 : performance.now() - pressedSince.right;
        pressedSince.right = -1;

        if (dtMs >= 0) {
            camera.updateManual({ deltaYaw: dtMs * YAW_SPEED });
        }
    };
    const onUpReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.up === -1 ? 0 : performance.now() - pressedSince.up;
        pressedSince.up = -1;

        if (dtMs >= 0) {
            camera.updateManual({ deltaPitch: -dtMs * PITCH_SPEED });
        }
    };
    const onDownReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.down === -1 ? 0 : performance.now() - pressedSince.down;
        pressedSince.down = -1;

        if (dtMs >= 0) {
            camera.updateManual({ deltaPitch: dtMs * PITCH_SPEED });
        }
    };

    createHotkey({ key: KeyCode.ArrowLeft }, onLeftPressed, onLeftReleased);
    createHotkey({ key: KeyCode.KeyA }, onLeftPressed, onLeftReleased);

    createHotkey({ key: KeyCode.ArrowRight }, onRightPressed, onRightReleased);
    createHotkey({ key: KeyCode.KeyD }, onRightPressed, onRightReleased);

    createHotkey({ key: KeyCode.ArrowUp }, onUpPressed, onUpReleased);
    createHotkey({ key: KeyCode.KeyW }, onUpPressed, onUpReleased);

    createHotkey({ key: KeyCode.ArrowDown }, onDownPressed, onDownReleased);
    createHotkey({ key: KeyCode.KeyS }, onDownPressed, onDownReleased);

    onBeforeRepaint(({ t }) => {
        let h = 0;
        let v = 0;

        if (pressedSince.up !== -1) {
            v -= t - pressedSince.up;
            pressedSince.up = t;
        }
        if (pressedSince.down !== -1) {
            v += t - pressedSince.down;
            pressedSince.down = t;
        }
        if (pressedSince.right !== -1) {
            h += t - pressedSince.right;
            pressedSince.right = t;
        }
        if (pressedSince.left !== -1) {
            h -= t - pressedSince.left;
            pressedSince.left = t;
        }

        camera.updateManual({ deltaPitch: v * PITCH_SPEED, deltaYaw: h * YAW_SPEED });
    });
}
