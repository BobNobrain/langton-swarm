import { createEffect, onCleanup } from 'solid-js';
import type { Object3D } from 'three';
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
