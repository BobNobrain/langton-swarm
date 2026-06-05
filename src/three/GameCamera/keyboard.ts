import type { GameCamera } from '@/game/camera';
import { createHotkey } from '@/lib/hotkey';
import { KeyCode } from '@/lib/input';
import { onBeforeRepaint } from '../hooks/handlers';

const YAW_SPEED = Math.PI / 12000;
const PITCH_SPEED = Math.PI / 11000;
const DISTANCE_SCALING = 1.1;

export function createCameraKeyboardControls(camera: GameCamera) {
    const pressedSince = {
        left: -1,
        right: -1,
        up: -1,
        down: -1,
        back: -1,
        forth: -1,
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
    const onBackPressed = (ev: KeyboardEvent) => {
        pressedSince.back = performance.now();
    };
    const onForthPressed = (ev: KeyboardEvent) => {
        pressedSince.forth = performance.now();
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
    const onBackReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.back === -1 ? 0 : performance.now() - pressedSince.back;
        pressedSince.back = -1;

        if (dtMs >= 0) {
            camera.updateManual({ distanceFactor: Math.pow(DISTANCE_SCALING, dtMs * 0.001) });
        }
    };
    const onForthReleased = (ev: KeyboardEvent) => {
        const dtMs = pressedSince.forth === -1 ? 0 : performance.now() - pressedSince.forth;
        pressedSince.forth = -1;

        if (dtMs >= 0) {
            camera.updateManual({ distanceFactor: Math.pow(DISTANCE_SCALING, -dtMs * 0.001) });
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

    createHotkey({ key: KeyCode.DigitRowMinus }, onBackPressed, onBackReleased);
    createHotkey({ key: KeyCode.DigitRowEquals }, onForthPressed, onForthReleased);

    onBeforeRepaint(({ t }) => {
        let hTime = 0;
        let vTime = 0;
        let zTime = 0;

        if (pressedSince.up !== -1) {
            vTime -= t - pressedSince.up;
            pressedSince.up = t;
        }
        if (pressedSince.down !== -1) {
            vTime += t - pressedSince.down;
            pressedSince.down = t;
        }
        if (pressedSince.right !== -1) {
            hTime += t - pressedSince.right;
            pressedSince.right = t;
        }
        if (pressedSince.left !== -1) {
            hTime -= t - pressedSince.left;
            pressedSince.left = t;
        }
        if (pressedSince.back !== -1) {
            zTime += t - pressedSince.back;
            pressedSince.back = t;
        }
        if (pressedSince.forth !== -1) {
            zTime -= t - pressedSince.forth;
            pressedSince.forth = t;
        }

        if (hTime !== 0 || vTime !== 0 || zTime !== 0) {
            camera.updateManual({
                deltaPitch: vTime * PITCH_SPEED,
                deltaYaw: hTime * YAW_SPEED,
                distanceFactor: Math.pow(DISTANCE_SCALING, zTime * 0.001),
            });
        }
    });
}
