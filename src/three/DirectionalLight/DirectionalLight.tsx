import { type Component, createEffect } from 'solid-js';
import * as T from 'three';
import { type UsePositionProps, usePosition } from '../hooks/usePosition';
import { useInScene } from '../hooks/useInScene';

type DirectionalLightProps = UsePositionProps & {
    ref?: (value: T.DirectionalLight) => void;
    name?: string;

    color: T.ColorRepresentation;
    intensity?: number;
};

export const DirectionalLight: Component<DirectionalLightProps> = (props) => {
    const light = new T.DirectionalLight();
    usePosition(props, light);

    props.ref?.(light);

    createEffect(() => {
        if (props.intensity) {
            light.intensity = props.intensity;
        }
    });
    createEffect(() => {
        light.color = new T.Color(props.color);
    });
    createEffect(() => {
        light.name = props.name ?? 'DirectionalLight';
    });

    useInScene(() => light);

    return null;
};
