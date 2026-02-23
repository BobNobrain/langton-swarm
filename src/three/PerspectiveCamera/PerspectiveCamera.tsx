import { type Component, createEffect } from 'solid-js';
import * as T from 'three';
import { useSceneRenderer } from '../context';
import { type UsePositionProps, usePosition } from '../hooks/usePosition';

export type PerspectiveCameraProps = UsePositionProps & {
    ref?: (cam: T.PerspectiveCamera) => void;

    fov?: number;
    near?: number;
    far?: number;

    main?: boolean;

    lookAt?: T.Vector3;
};

export const PerspectiveCamera: Component<PerspectiveCameraProps> = (props) => {
    const { getBounds, setMainCamera } = useSceneRenderer();
    const cam = new T.PerspectiveCamera(props.fov, 1, props.near, props.far);

    usePosition(props, cam);

    createEffect(() => {
        if (props.main) {
            setMainCamera(cam);
        }
    });

    createEffect(() => {
        if (props.lookAt) {
            cam.lookAt(props.lookAt);
        }
    });

    createEffect(() => {
        const { width, height } = getBounds(); // register this effect to happen when canvas is resized
        cam.aspect = width / height;
        cam.updateProjectionMatrix();
    });

    props.ref?.(cam);

    return null;
};
