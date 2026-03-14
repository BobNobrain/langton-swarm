import { createContext, useContext } from 'solid-js';
import { type WebGLRenderer, type Camera, type Scene, type Raycaster, type Intersection, type Object3D } from 'three';
import type { Event, SparseCollection } from '@/lib/sparse';
import type { MouseButton } from '@/lib/input';

export type SceneRendererContext = {
    renderer: () => WebGLRenderer | null;
    canvas: () => HTMLCanvasElement;

    getBounds: () => DOMRect;
    getMainCamera: () => Camera | null;
    setMainCamera: (c: Camera) => void;

    scene: () => Scene;

    /** Happens right before the scene is painted (again) */
    readonly repaint: Event<Repainter>;
    /** Happens when a click has happened in the scene, but no objects under the cursor have handled it */
    readonly emptyClick: Event<ClickHandler>;
    readonly clickableObjects: SparseCollection<ClickableObject3D>;
};

export type Repainter = (t: number, dt: number) => void;
export type ClickHandler = (ev: MouseEvent, raycaster: Raycaster) => void;

export type Object3DClickEvent = {
    /** Browser native event */
    source: MouseEvent;
    /** Raycaster intersection object where the click happened */
    intersection: Intersection;
    /**
     * First handler to not invoke this method will be the last to be called.
     * If this click was not handled by current object (i.e. dynamic checks showed that it is not interactive atm),
     * this method should be called to allow further raycaster intersections to be handled.
     */
    markNotHandled(): void;
};

export type Object3DClickHandler = (ev: Object3DClickEvent) => void;
export type ClickableObject3D = {
    /** Which object(s) should this handler be attached to */
    object: () => Object3D | Object3D[] | null;
    /** A dynamic check to optionally skip this handler */
    skip?: () => boolean;
    /** Which button(s) should this handler be invoked for (all of them by default) */
    button?: MouseButton | MouseButton[];
    /** The handler to be invoked when click happens */
    handler: Object3DClickHandler;
};

const outOfContext = new Proxy({} as SceneRendererContext, {
    get: (_, prop) => {
        throw new Error(`trying to get "${String(prop)}" out of SceneRendererContext`);
    },
});

export const SceneRendererContext = createContext<SceneRendererContext>(outOfContext);

export const useSceneRenderer = () => useContext(SceneRendererContext);
