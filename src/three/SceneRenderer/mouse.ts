import { Vector2, type Camera, type Object3D, type Raycaster } from 'three';
import type { Event, SparseCollection } from '@/lib/sparse';
import type { ClickableObject3D, ClickHandler } from '../context';

type MouseEventContext = {
    camera: Camera;
    canvasBounds: DOMRect;
    raycaster: Raycaster;
    objects: SparseCollection<ClickableObject3D>;
};

export function handleSceneClick(
    ev: MouseEvent,
    { camera, canvasBounds, raycaster, objects }: MouseEventContext,
    emptyClick: Event<ClickHandler>,
) {
    setupRaycaster(raycaster, camera, ev, canvasBounds);

    const targetsByMesh = new Map<Object3D, ClickableObject3D>();

    for (const target of objects.all()) {
        if (target.button !== undefined) {
            const matchesButton = Array.isArray(target.button)
                ? target.button.includes(ev.button)
                : target.button === ev.button;

            if (!matchesButton) {
                continue;
            }
        }

        if (target.skip && target.skip()) {
            continue;
        }

        const mesh = target.object();
        if (!mesh) {
            continue;
        }

        if (Array.isArray(mesh)) {
            for (const m of mesh) {
                targetsByMesh.set(m, target);
            }
        } else {
            targetsByMesh.set(mesh, target);
        }
    }

    const intersections = raycaster.intersectObjects(Array.from(targetsByMesh.keys()));
    let shouldContinue = true;
    const markNotHandled = () => {
        shouldContinue = true;
    };

    for (const intersection of intersections) {
        const target = targetsByMesh.get(intersection.object);
        if (!target) {
            continue;
        }

        shouldContinue = false;
        target.onClick({
            source: ev,
            intersection,
            markNotHandled,
        });

        if (!shouldContinue) {
            break;
        }
    }

    if (shouldContinue) {
        emptyClick.trigger(ev, raycaster);
    }
}

export function createMouseTracker() {
    let mx = 0,
        my = 0;
    let inside = false;

    const onMouseMove = (ev: MouseEvent) => {
        inside = true;
        mx = ev.offsetX;
        my = ev.offsetY;
    };
    const onMouseLeave = (ev: MouseEvent) => {
        inside = false;
    };

    return {
        getMousePos: () => (inside ? { offsetX: mx, offsetY: my } : null),
        onMouseMove,
        onMouseLeave,
    };
}

export function setupRaycaster(
    raycaster: Raycaster,
    camera: Camera,
    mouse: {
        offsetX: number;
        offsetY: number;
    },
    bounds: DOMRect,
) {
    const { width, height } = bounds;
    const pointer = new Vector2((mouse.offsetX / width) * 2 - 1, 1 - (mouse.offsetY / height) * 2);
    raycaster.setFromCamera(pointer, camera);
}
