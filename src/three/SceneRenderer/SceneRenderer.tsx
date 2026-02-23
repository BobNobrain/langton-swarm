import { onMount, onCleanup, createEffect, createSignal, type ParentComponent, untrack } from 'solid-js';
import { Scene, WebGLRenderer, type Camera, type ColorRepresentation } from 'three';
import { createBoundsTracker } from '@/lib/BoundsTracker';
import { SceneRendererContext, type Repainter } from '../context';
import styles from './SceneRenderer.module.css';

type SceneRendererProps = {
    clearColor?: ColorRepresentation;
};

export const SceneRenderer: ParentComponent<SceneRendererProps> = (props) => {
    let canvas!: HTMLCanvasElement;
    const { getBounds, ref: wrapperRef } = createBoundsTracker<HTMLDivElement>();

    const scene = new Scene();
    let renderer: WebGLRenderer | null = null;
    const [getMainCamera, setMainCamera] = createSignal<Camera | null>(null);

    const repainters: Record<number, Repainter> = {};
    let repainterId = 0;

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
            for (const repainter of Object.values(repainters)) {
                repainter(time, dt);
            }
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
        addRepainter: (f) => {
            const id = repainterId;
            ++repainterId;
            repainters[id] = f;
            return id;
        },
        removeRepainter: (id) => {
            delete repainters[id];
        },
    };

    return (
        <div ref={wrapperRef} class={styles.wrapper}>
            <canvas class={styles.canvas} ref={canvas} />
            <SceneRendererContext.Provider value={context}>{props.children}</SceneRendererContext.Provider>
        </div>
    );
};
