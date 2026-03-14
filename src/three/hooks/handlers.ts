import { onCleanup, onMount } from 'solid-js';
import { type Repainter, useSceneRenderer, type ClickHandler, type ClickableObject3D } from '../context';

/** Adds a component-level handler that adjusts scene objects before scene repaint happens */
export function onBeforeRepaint(repainter: Repainter) {
    const { repaint } = useSceneRenderer();
    onMount(() => {
        const id = repaint.on(repainter);
        onCleanup(() => repaint.off(id));
    });
}

/** Invokes `listener` each time there is a click in the scene that was not handled by any object */
export function onSceneEmptyClick(listener: ClickHandler) {
    const { emptyClick } = useSceneRenderer();
    onMount(() => {
        const id = emptyClick.on(listener);
        onCleanup(() => emptyClick.off(id));
    });
}

/** Associates a click handler with a given mesh (or multiple meshes) */
export function useClickableMesh(cm: ClickableObject3D) {
    const { clickableObjects: clickableMeshes } = useSceneRenderer();
    onMount(() => {
        const id = clickableMeshes.add(cm);
        onCleanup(() => clickableMeshes.delete(id));
    });
}
