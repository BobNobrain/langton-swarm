import { Spherical, type Vector3 } from 'three';

export type CameraOrbit = {
    pitch: number;
    yaw: number;
    distance: number;
};

export type CameraOrbitChange = {
    deltaPitch?: number;
    deltaYaw?: number;
    distanceFactor?: number;
};

export type GameCamera = {
    getOrbit(t: number): Readonly<CameraOrbit>;
    updateManual(change: CameraOrbitChange): void;
    animateTo(pos: Partial<CameraOrbit>, timeMs?: number): void;
};

const PITCH_MIN = 0.087; // ~5deg
const PITCH_MAX = Math.PI - PITCH_MIN;

type AnimationState = {
    origin: CameraOrbit;
    target: CameraOrbit;
    start: number;
    end: number;
};

function interpolate(animation: AnimationState, t: number): { result: CameraOrbit; done: boolean } {
    if (t >= animation.end) {
        return { result: animation.target, done: true };
    }
    if (t <= animation.start) {
        return { result: animation.origin, done: false };
    }

    const linear = (t - animation.start) / (animation.end - animation.start);
    const eased = Math.sqrt(linear); // a very crude easing

    return {
        result: {
            pitch: eased * (animation.target.pitch - animation.origin.pitch),
            yaw: eased * (animation.target.yaw - animation.origin.yaw),
            distance: eased * (animation.target.distance - animation.origin.distance),
        },
        done: false,
    };
}

export function createGameCamera(planetRadius: number): GameCamera {
    const MIN_DISTANCE = planetRadius * 1.1;
    const MAX_DISTANCE = planetRadius * 5;
    const orbit: CameraOrbit = { pitch: Math.PI / 2, yaw: 0, distance: planetRadius * 2 };

    let animation: AnimationState | null = null;

    const breakAnimation = (t: number) => {
        if (!animation) {
            return;
        }

        const { result } = interpolate(animation, t);
        Object.assign(orbit, result);
        animation = null;
    };

    return {
        getOrbit(t) {
            if (!animation) {
                return orbit;
            }

            const { result, done } = interpolate(animation, t);
            if (done) {
                animation = null;
                Object.assign(orbit, result);
            }

            return result;
        },

        updateManual(change) {
            breakAnimation(performance.now());
            const { deltaPitch, deltaYaw, distanceFactor } = change;

            if (change.distanceFactor) {
                orbit.distance *= change.distanceFactor;
                orbit.distance = Math.max(MIN_DISTANCE, Math.min(orbit.distance, MAX_DISTANCE));
            }

            const pitchYawMovementSpeedFromDistance = orbit.distance / planetRadius;

            if (deltaYaw) {
                orbit.yaw += deltaYaw * pitchYawMovementSpeedFromDistance;
            }

            if (deltaPitch) {
                orbit.pitch += deltaPitch * pitchYawMovementSpeedFromDistance;
                orbit.pitch = Math.max(PITCH_MIN, Math.min(orbit.pitch, PITCH_MAX));
            }
        },

        animateTo(pos, timeMs = 200) {
            const now = performance.now();
            breakAnimation(now);

            if (pos.pitch !== undefined) {
                pos.pitch = Math.max(PITCH_MIN, Math.min(pos.pitch, PITCH_MAX));
            }

            animation = {
                start: now,
                end: now + timeMs,
                origin: { ...orbit },
                target: { ...orbit, ...pos },
            };
        },
    };
}

export function getCameraOrbitForCoords(coords: Vector3): CameraOrbit {
    const { radius, phi, theta } = new Spherical().setFromVector3(coords);
    return {
        pitch: phi,
        yaw: theta,
        distance: radius,
    };
}
