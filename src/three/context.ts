import { createContext, useContext } from 'solid-js';
import { type WebGLRenderer, type Camera, type Scene } from 'three';

export type SceneRendererContext = {
    renderer: () => WebGLRenderer | null;
    canvas: () => HTMLCanvasElement;

    getBounds: () => DOMRect;
    getMainCamera: () => Camera | null;
    setMainCamera: (c: Camera) => void;

    scene: () => Scene;

    addRepainter: (f: Repainter) => number;
    removeRepainter: (id: number) => void;
};

export type Repainter = (t: number, dt: number) => void;

const outOfContext = () => {
    throw new Error('SceneRendererContext: tried to render three component outside of SceneRenderer!');
};

export const SceneRendererContext = createContext<SceneRendererContext>({
    renderer: outOfContext,
    canvas: outOfContext,
    getBounds: outOfContext,
    getMainCamera: outOfContext,
    setMainCamera: outOfContext,
    scene: outOfContext,
    addRepainter: outOfContext,
    removeRepainter: outOfContext,
});

export const useSceneRenderer = () => useContext(SceneRendererContext);
