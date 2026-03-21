import { createEffect, onCleanup } from 'solid-js';
import { Object3D } from 'three';
import { useSceneRenderer } from '../context';

export function useInScene(object: () => Object3D | null) {
    const { scene } = useSceneRenderer();

    createEffect(() => {
        const obj = object();
        const s = scene();

        if (obj) {
            s.add(obj);
        }

        onCleanup(() => {
            if (obj) {
                s.remove(obj);
            }
        });
    });

    onCleanup(() => {
        // just in case
        const obj = object();
        if (obj) {
            scene().remove(obj);
        }
    });
}

export function useAllInScene(objects: () => Object3D[]) {
    const { scene } = useSceneRenderer();
    const alreadyIn = new Set<Object3D>();

    createEffect(() => {
        const objs = objects();
        const s = scene();

        const staleObjects = new Set(alreadyIn);

        for (const obj of objs) {
            staleObjects.delete(obj);

            if (!alreadyIn.has(obj)) {
                alreadyIn.add(obj);
                s.add(obj);
            }
        }

        for (const stale of staleObjects) {
            s.remove(stale);
            alreadyIn.delete(stale);
        }
    });

    onCleanup(() => {
        const s = scene();

        for (const obj of alreadyIn) {
            s.remove(obj);
        }
    });
}
