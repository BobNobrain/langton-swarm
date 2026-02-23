import { createEffect, type Component } from 'solid-js';
import * as T from 'three';
import { useInScene } from '../hooks/useInScene';

type AmbientLightProps = {
    name?: string;
    color?: T.ColorRepresentation;
    intensity?: number;
};

export const AmbientLight: Component<AmbientLightProps> = (props) => {
    const light = new T.AmbientLight();

    createEffect(() => {
        if (props.color) {
            light.color = new T.Color(props.color);
        }
    });
    createEffect(() => {
        if (props.intensity) {
            light.intensity = props.intensity;
        }
    });
    createEffect(() => {
        light.name = props.name ?? 'AmbientLight';
    });

    useInScene(() => light);

    return null;
};
