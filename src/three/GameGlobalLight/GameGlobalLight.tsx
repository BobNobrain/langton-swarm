import type { Component } from 'solid-js';
import { AmbientLight, DirectionalLight } from 'three';
import { onBeforeRepaint } from '../hooks/handlers';
import { useInScene } from '../hooks/useInScene';
import { useGame } from '@/gameContext';

// const SUN_SPEED = Math.PI / 30_000; // 1 rpm
// const SUN_HEIGHT = 0.2;

export const GameGlobalLight: Component = () => {
    const ambient = new AmbientLight('#aaccff', 0.2);
    const sunlight = new DirectionalLight('#fff8dd', 0.8);
    sunlight.position.set(1, 0, 0);

    useInScene(() => ambient);
    useInScene(() => sunlight);

    const { world } = useGame();

    onBeforeRepaint(() => {
        sunlight.position.set(...world.sunPosition);
    });

    return null;
};
