import { createEffect, createMemo, type Component } from 'solid-js';
import {
    DynamicDrawUsage,
    InstancedMesh,
    Object3D,
    Quaternion,
    Vector3,
    type BufferGeometry,
    type Material,
} from 'three';
import type { SurfaceNode } from '@/game/types';
import { useInScene } from '../hooks/useInScene';
import { onBeforeRepaint, useClickableMesh } from '../hooks/handlers';
import { MouseButton } from '@/lib/input';

type GridObjectState = {
    nodeId: number;
    targetPos: Vector3;
    sourcePos: Vector3;
    interpolationStarted: number;
    isDirty: boolean;
};

const INTERPOLATION_TIME = 200;
const DEFAULT_MAX_COUNT = 1000;

export const GridObjects: Component<{
    geom: BufferGeometry;
    material: Material;
    nodeIds: number[];
    allNodes: SurfaceNode[];
    maxCount?: number;
    onClick?: (index: number) => void;
}> = (props) => {
    const mesh = createMemo(() => {
        const instanced = new InstancedMesh(props.geom, props.material, props.maxCount ?? DEFAULT_MAX_COUNT);
        instanced.instanceMatrix.setUsage(DynamicDrawUsage);
        instanced.count = 0;
        return instanced;
    });

    if (props.onClick) {
        useClickableMesh({
            object: mesh,
            button: MouseButton.Left,
            handler: ({ intersection }) => {
                const instanceIndex = intersection.instanceId;
                if (instanceIndex === undefined) {
                    return;
                }

                props.onClick!(instanceIndex);
            },
        });
    }

    const states: GridObjectState[] = [];
    createEffect(() => {
        const nodeIds = props.nodeIds;
        const allNodes = props.allNodes;

        if (nodeIds.length < states.length) {
            states.length = nodeIds.length;
        } else {
            while (nodeIds.length > states.length) {
                const nodeId = nodeIds[states.length];
                states.push({
                    nodeId,
                    targetPos: allNodes[nodeId].position,
                    sourcePos: allNodes[nodeId].position,
                    interpolationStarted: -1,
                    isDirty: true,
                });
            }
        }

        for (let i = 0; i < nodeIds.length; i++) {
            const state = states[i];
            const oldId = state.nodeId;
            const newId = nodeIds[i];

            if (oldId === newId) {
                continue;
            }

            state.nodeId = nodeIds[i];
            state.sourcePos = state.targetPos;
            state.targetPos = allNodes[newId].position;
            state.interpolationStarted = performance.now();
            state.isDirty = true;
        }
    });

    onBeforeRepaint((t) => {
        const instanced = mesh();
        const N = Math.min(states.length, props.maxCount ?? DEFAULT_MAX_COUNT);
        const dummy = new Object3D();
        const up = new Vector3(0, 1, 0);

        if (N !== instanced.count) {
            instanced.count = N;
        }

        for (let i = 0; i < N; i++) {
            const state = states[i];
            if (!state.isDirty) {
                continue;
            }

            const interpolationCoeff =
                state.interpolationStarted === -1
                    ? 1
                    : Math.max(0, Math.min((t - state.interpolationStarted) / INTERPOLATION_TIME, 1));

            if (interpolationCoeff === 1) {
                state.isDirty = false;
            }

            const currentPos = state.sourcePos.clone().lerp(state.targetPos, interpolationCoeff);
            dummy.position.set(currentPos.x, currentPos.y, currentPos.z);
            dummy.setRotationFromQuaternion(new Quaternion().setFromUnitVectors(up, currentPos));
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }

        instanced.instanceMatrix.needsUpdate = true;
    });

    useInScene(mesh);

    return null;
};
