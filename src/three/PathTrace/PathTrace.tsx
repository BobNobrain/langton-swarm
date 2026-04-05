import { createMemo, type Component } from 'solid-js';
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { GridObjects, type GridObjectData } from '../GridObjects/GridObjects';
import type { NodeId, SurfaceNode } from '@/game';
import { useInScene } from '../hooks/useInScene';

const pathTraceModel = new SphereGeometry(0.02, 8, 8);
const pathStartMaterial = new MeshBasicMaterial({ color: 0xff3000 });
const pathEndMaterial = new MeshBasicMaterial({ color: 0x00a000 });
const pathStepMaterial = new MeshBasicMaterial({ color: 0xb0a030 });

export const PathTrace: Component<{ path: NodeId[]; nodes: SurfaceNode[] }> = (props) => {
    const stepObjects = createMemo((): Record<string, GridObjectData> => {
        const stepNodeIds = props.path.slice(1, -1);
        const result: Record<string, GridObjectData> = {};
        for (const step of stepNodeIds) {
            result[step] = { location: step };
        }
        return result;
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
            grid={props.nodes}
            geom={pathTraceModel}
            material={pathStepMaterial}
            objects={stepObjects()}
            maxCount={Math.max(0, props.path.length - 2)}
        />
    );
};
