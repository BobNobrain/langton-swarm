import { createEffect } from 'solid-js';
import type * as T from 'three';

export type UsePositionProps = {
    positionX?: number;
    positionY?: number;
    positionZ?: number;
};

export function usePosition(props: UsePositionProps, object: T.Object3D) {
    createEffect(() => {
        if (props.positionX !== undefined) {
            object.position.setX(props.positionX);
        }
    });
    createEffect(() => {
        if (props.positionY !== undefined) {
            object.position.setY(props.positionY);
        }
    });
    createEffect(() => {
        if (props.positionZ !== undefined) {
            object.position.setZ(props.positionZ);
        }
    });
}
