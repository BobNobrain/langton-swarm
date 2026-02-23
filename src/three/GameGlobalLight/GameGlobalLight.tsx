import type { Component } from 'solid-js';
import { AmbientLight, DirectionalLight } from 'three';
import { onBeforeRepaint } from '../hooks/onBeforeRepaint';
import { useInScene } from '../hooks/useInScene';

const SUN_SPEED = Math.PI / 30_000; // 1 rpm
const SUN_HEIGHT = 0.2;

export const GameGlobalLight: Component = () => {
    const ambient = new AmbientLight('#aaccff', 0.2);
    const sunlight = new DirectionalLight('#fff8dd', 0.8);
    sunlight.position.set(1, SUN_HEIGHT, 0);

    useInScene(() => ambient);
    useInScene(() => sunlight);

    onBeforeRepaint((t) => {
        sunlight.position.set(Math.cos(t * SUN_SPEED), SUN_HEIGHT, Math.sin(t * SUN_SPEED));
    });

    return null;
};
