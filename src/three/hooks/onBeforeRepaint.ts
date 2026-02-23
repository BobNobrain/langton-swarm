import { onCleanup, onMount } from 'solid-js';
import { Repainter, useSceneRenderer } from '../context';

export function onBeforeRepaint(repainter: Repainter) {
    const { addRepainter, removeRepainter } = useSceneRenderer();
    onMount(() => {
        const id = addRepainter(repainter);
        onCleanup(() => removeRepainter(id));
    });
}
