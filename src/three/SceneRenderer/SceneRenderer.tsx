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
} from '../context';
import styles from './SceneRenderer.module.css';

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

            const dt = lastTime === -1 ? 0 : time - lastTime;
            lastTime = time;
            repaint.trigger(time, dt);
            renderer.render(scene, cam);

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

    const handleSceneClick = (ev: MouseEvent) => {
        const cam = getMainCamera();
        if (!cam) {
            return;
        }

        const { width, height } = getBounds();
        const pointer = new Vector2((ev.offsetX / width) * 2 - 1, 1 - (ev.offsetY / height) * 2);
        raycaster.setFromCamera(pointer, cam);

        const targetsByMesh = new Map<Object3D, ClickableObject3D>();

        for (const target of clickableObjects.all()) {
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
            target.handler({
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
    };

    return (
        <div ref={wrapperRef} class={styles.wrapper}>
            <canvas class={styles.canvas} ref={canvas} onClick={handleSceneClick} />
            <SceneRendererContext.Provider value={context}>{props.children}</SceneRendererContext.Provider>
        </div>
    );
};
