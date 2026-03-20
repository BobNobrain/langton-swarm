import { onMount, onCleanup, createEffect, createSignal, type ParentComponent, untrack } from 'solid-js';
import {
    Raycaster,
    Scene,
    Vector2,
    WebGLRenderer,
    type Camera,
    type ColorRepresentation,
    type Intersection,
    type Object3D,
} from 'three';
import { createBoundsTracker } from '@/lib/BoundsTracker';
import { createEvent, createSparseCollection } from '@/lib/sparse';
import {
    type ClickHandler,
    SceneRendererContext,
    type Repainter,
    type ClickableObject3D,
    type Object3DClickHandler,
    type Object3DClickEvent,
    type RepaintContext,
} from '../context';
import styles from './SceneRenderer.module.css';
import { createMouseTracker, handleSceneClick, setupRaycaster } from './mouse';

type SceneRendererProps = {
    clearColor?: ColorRepresentation;
};

export const SceneRenderer: ParentComponent<SceneRendererProps> = (props) => {
    let canvas!: HTMLCanvasElement;
    const { getBounds, ref: wrapperRef } = createBoundsTracker<HTMLDivElement>();

    const scene = new Scene();
    let renderer: WebGLRenderer | null = null;
    const raycaster = new Raycaster();
    const [getMainCamera, setMainCamera] = createSignal<Camera | null>(null);
    const mouseTracker = createMouseTracker();

    const repaint = createEvent<Repainter>();
    const emptyClick = createEvent<ClickHandler>();

    const clickableObjects = createSparseCollection<ClickableObject3D>();

    onMount(() => {
        if (!canvas) {
            throw new Error('canvas ref is not set');
        }

        renderer = new WebGLRenderer({
            canvas,
            antialias: true,
        });

        createEffect(() => {
            renderer!.setClearColor(props.clearColor ?? 0x101010, 1);
        });

        let active = true;
        let lastTime = -1;

        const animate = (time: DOMHighResTimeStamp) => {
            if (!active || !renderer) {
                return;
            }

            const cam = getMainCamera();
            if (!cam) {
                return;
            }

            const mouse = mouseTracker.getMousePos();
            if (mouse) {
                setupRaycaster(raycaster, cam, mouse, canvas.getBoundingClientRect());
            }

            // prepare the scene
            repaint.trigger({
                t: time,
                dt: lastTime === -1 ? 0 : time - lastTime,
                cursor: mouse ? raycaster : null,
            });

            // render the scene
            renderer.render(scene, cam);
            lastTime = time;

            // schedule next repaint
            requestAnimationFrame(animate);
        };

        createEffect(() => {
            const newBounds = getBounds();
            renderer?.setSize(newBounds.width, newBounds.height);

            const cam = untrack(getMainCamera);
            if (cam && renderer) {
                renderer.render(scene, cam);
            }
        });

        createEffect(() => {
            const cam = getMainCamera();
            if (cam) {
                active = true;
                requestAnimationFrame(animate);
            } else {
                active = false;
            }
        });

        onCleanup(() => {
            active = false;
            setMainCamera(null);
            renderer?.dispose();
        });
    });

    const context: SceneRendererContext = {
        canvas: () => canvas,
        renderer: () => renderer,
        scene: () => scene,
        getBounds,
        getMainCamera,
        setMainCamera,
        repaint,
        emptyClick,
        clickableObjects,
    };

    const handleCanvasClick = (ev: MouseEvent) => {
        const cam = getMainCamera();
        if (!cam) {
            return;
        }

        handleSceneClick(
            ev,
            { camera: cam, raycaster, objects: clickableObjects, canvasBounds: getBounds() },
            emptyClick,
        );
    };

    return (
        <div ref={wrapperRef} class={styles.wrapper}>
            <canvas
                ref={canvas}
                class={styles.canvas}
                onClick={handleCanvasClick}
                onMouseMove={mouseTracker.onMouseMove}
                onMouseLeave={mouseTracker.onMouseLeave}
            />
            <SceneRendererContext.Provider value={context}>{props.children}</SceneRendererContext.Provider>
        </div>
    );
};
