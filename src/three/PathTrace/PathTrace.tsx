import { createMemo, type Component } from 'solid-js';
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { GridObjects } from '../GridObjects/GridObjects';
import type { SurfaceNode } from '@/game';
import { useInScene } from '../hooks/useInScene';

const pathTraceModel = new SphereGeometry(0.02, 8, 8);
const pathStartMaterial = new MeshBasicMaterial({ color: 0xff3000 });
const pathEndMaterial = new MeshBasicMaterial({ color: 0x00a000 });
const pathStepMaterial = new MeshBasicMaterial({ color: 0xb0a030 });

export const PathTrace: Component<{ path: number[]; nodes: SurfaceNode[] }> = (props) => {
    const stepIds = createMemo(() => {
        return props.path.slice(1, -1);
    });

    const startModel = createMemo(() => {
        const startIndex = props.path[0];
        if (startIndex === undefined) {
            return null;
        }

        const mesh = new Mesh(pathTraceModel, pathStartMaterial);
        const startCoords = props.nodes[startIndex].position;
        mesh.position.set(startCoords.x, startCoords.y, startCoords.z);
        return mesh;
    });
    useInScene(startModel);

    const endModel = createMemo(() => {
        const endIndex = props.path[props.path.length - 1];
        if (endIndex === undefined) {
            return null;
        }

        const mesh = new Mesh(pathTraceModel, pathEndMaterial);
        const endCoords = props.nodes[endIndex].position;
        mesh.position.set(endCoords.x, endCoords.y, endCoords.z);
        return mesh;
    });
    useInScene(endModel);

    return (
        <GridObjects
            allNodes={props.nodes}
            geom={pathTraceModel}
            material={pathStepMaterial}
            nodeIds={stepIds()}
            maxCount={stepIds().length}
        />
    );
};
