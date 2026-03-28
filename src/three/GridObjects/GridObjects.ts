import { createMemo, type Component } from 'solid-js';
import {
    DynamicDrawUsage,
    InstancedMesh,
    Object3D,
    Quaternion,
    Vector3,
    type BufferGeometry,
    type Material,
} from 'three';
import type { NodeId, SurfaceNode } from '@/game';
import { MouseButton } from '@/lib/input';
import { onBeforeRepaint, useClickableMesh } from '../hooks/handlers';
import { useInScene } from '../hooks/useInScene';

type GridObjectState = {
    location: number;
    targetPos: Vector3;
    sourcePos: Vector3;
    interpolationStarted: number;
    isDirty: boolean;
};

const INTERPOLATION_TIME = 200;
const DEFAULT_MAX_COUNT = 1000;

export type GridObjectData = {
    location: NodeId;
};

export const GridObjects: Component<{
    geom: BufferGeometry;
    material: Material;
    grid: SurfaceNode[];
    objects: Record<string, GridObjectData>;
    isStatic?: boolean;
    maxCount?: number;
    onClick?: (index: number) => void;
}> = (props) => {
    const mesh = createMemo(() => {
        const instanced = new InstancedMesh(props.geom, props.material, props.maxCount ?? DEFAULT_MAX_COUNT);
        instanced.instanceMatrix.setUsage(DynamicDrawUsage);
        instanced.count = 0;
        return instanced;
    });
    useInScene(mesh);

    if (props.onClick) {
        useClickableMesh({
            object: mesh,
            button: MouseButton.Left,
            onClick: ({ intersection }) => {
                const instanceIndex = intersection.instanceId;
                if (instanceIndex === undefined) {
                    return;
                }

                props.onClick!(instanceIndex);
            },
        });
    }

    const states: Record<string | number, GridObjectState> = {};
    const syncStates = (time: number) => {
        const grid = props.grid;
        const objects = props.objects;
        const objectIds = Object.keys(objects);

        const obsoleteStateIds = new Set(Object.keys(states));

        for (const objectId of objectIds) {
            const { location } = objects[objectId];
            const state = states[objectId];

            if (!state) {
                // this is a new object, we should create a state for it
                states[objectId] = {
                    location,
                    targetPos: grid[location].position,
                    sourcePos: grid[location].position,
                    interpolationStarted: -1,
                    isDirty: true,
                };
                continue;
            }

            // this state already exists and should be appropriately updated
            obsoleteStateIds.delete(objectId);

            if (location === state.location) {
                // the state hasn't changed
                continue;
            }

            // set interpolation params
            state.location = location;
            state.sourcePos = state.targetPos;
            state.targetPos = grid[location].position;
            state.interpolationStarted = time;
            state.isDirty = true;
        }

        // removing the states that are no longer required
        for (const obsoleteId of obsoleteStateIds.values()) {
            delete states[obsoleteId];
        }
    };

    const updateInstanced = (time: number) => {
        const instanced = mesh();
        const ids = Object.keys(states);
        const N = Math.min(ids.length, props.maxCount ?? DEFAULT_MAX_COUNT);
        const dummy = new Object3D();
        const up = new Vector3(0, 1, 0);

        let needsUpdate = false;

        if (N !== instanced.count) {
            needsUpdate = true;
            instanced.count = N;
        }

        for (let i = 0; i < N; i++) {
            const state = states[ids[i]];
            if (!state.isDirty) {
                continue;
            }

            needsUpdate = true;

            const interpolationCoeff =
                state.interpolationStarted === -1
                    ? 1
                    : Math.max(0, Math.min((time - state.interpolationStarted) / INTERPOLATION_TIME, 1));

            if (interpolationCoeff === 1) {
                state.isDirty = false;
            }

            const currentPos = state.sourcePos.clone().lerp(state.targetPos, interpolationCoeff);
            dummy.position.set(currentPos.x, currentPos.y, currentPos.z);
            dummy.setRotationFromQuaternion(new Quaternion().setFromUnitVectors(up, currentPos));
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }

        instanced.instanceMatrix.needsUpdate = needsUpdate;
    };

    if (props.isStatic) {
        const t = performance.now();
        syncStates(t);
        updateInstanced(t);
    } else {
        onBeforeRepaint(({ t }) => {
            syncStates(t);
            updateInstanced(t);
        });
    }

    return null;
};
