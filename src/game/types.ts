import type { Vector3 } from 'three';

export type SurfaceNode = {
    index: number;
    position: Vector3;
    connections: Set<number>;
};

export type Planet = {
    nodes: SurfaceNode[];
    resources: Map<number, unknown>;
};
