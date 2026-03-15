import { type Component, createEffect, onCleanup, onMount } from 'solid-js';
import { PerspectiveCamera, Vector3 } from 'three';
import { useSceneRenderer } from '../context';
import { onBeforeRepaint } from '../hooks/handlers';
import { KeyCode } from '@/lib/input';

export type GameCameraProps = {
    ref?: (cam: PerspectiveCamera) => void;

    fov?: number;
    near?: number;
    far?: number;
};

type CameraOrbit = {
    pitch: number;
    yaw: number;
    distance: number;
};

const PITCH_MIN = 0.087; // ~5deg
const PITCH_MAX = Math.PI - PITCH_MIN;
const YAW_SPEED = Math.PI / 5000;
const PITCH_SPEED = Math.PI / 4000;

export const GameCamera: Component<GameCameraProps> = (props) => {
    const { getBounds, setMainCamera } = useSceneRenderer();
    const cam = new PerspectiveCamera(props.fov, 1, props.near, props.far);
    const looksAt = new Vector3(0, 0, 0);

    const orbit: CameraOrbit = {
        pitch: Math.PI / 2,
        yaw: 0,
        distance: 2,
    };
    const syncToKeyboard = useKeyboardRotationControls(orbit);

    onBeforeRepaint((t) => {
        syncToKeyboard(t);

        const { pitch, yaw, distance } = orbit;
        cam.position.setFromSphericalCoords(distance, pitch, yaw).add(looksAt);
        cam.lookAt(looksAt);
    });

    onMount(() => {
        setMainCamera(cam);
    });

    createEffect(() => {
        const { width, height } = getBounds(); // register this effect to happen when canvas is resized
        cam.aspect = width / height;
        cam.updateProjectionMatrix();
    });

    props.ref?.(cam);

    return null;
};

function useKeyboardRotationControls(target: CameraOrbit): (t: number) => void {
    const presses = {
        up: -1,
        down: -1,
        left: -1,
        right: -1,
    };

    const sync = (t: number) => {
        let h = 0;
        let v = 0;

        if (presses.up !== -1) {
            v += t - presses.up;
            presses.up = t;
        }
        if (presses.down !== -1) {
            v -= t - presses.down;
            presses.down = t;
        }
        if (presses.right !== -1) {
            h += t - presses.right;
            presses.right = t;
        }
        if (presses.left !== -1) {
            h -= t - presses.left;
            presses.left = t;
        }

        if (h !== 0) {
            target.yaw += h * YAW_SPEED;
        }
        if (v !== 0) {
            target.pitch -= v * PITCH_SPEED;
            target.pitch = Math.max(PITCH_MIN, Math.min(target.pitch, PITCH_MAX));
        }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
        switch (ev.code) {
            case KeyCode.ArrowDown:
            case KeyCode.KeyS:
                if (presses.down === -1) {
                    presses.down = performance.now();
                }
                break;

            case KeyCode.ArrowUp:
            case KeyCode.KeyW:
                if (presses.up === -1) {
                    presses.up = performance.now();
                }
                break;

            case KeyCode.ArrowRight:
            case KeyCode.KeyD:
                if (presses.right === -1) {
                    presses.right = performance.now();
                }
                break;

            case KeyCode.ArrowLeft:
            case KeyCode.KeyA:
                if (presses.left === -1) {
                    presses.left = performance.now();
                }
                break;
        }
    };

    const onKeyUp = (ev: KeyboardEvent) => {
        switch (ev.code) {
            case KeyCode.ArrowDown:
            case KeyCode.KeyS:
                presses.down = -1;
                break;

            case KeyCode.ArrowUp:
            case KeyCode.KeyW:
                presses.up = -1;
                break;

            case KeyCode.ArrowRight:
            case KeyCode.KeyD:
                presses.right = -1;
                break;

            case KeyCode.ArrowLeft:
            case KeyCode.KeyA:
                presses.left = -1;
                break;

            default:
                return;
        }

        sync(performance.now());
    };

    onMount(() => {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        onCleanup(() => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        });
    });

    return sync;
}
