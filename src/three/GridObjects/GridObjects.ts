import { createMemo, type Component } from 'solid-js';
import {
    DynamicDrawUsage,
    InstancedMesh,
    Matrix4,
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
    objectId: string;
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
    positioning?: GridObjectPositioning;
};

export type GridObjectPositioning = {
    isDirty?: boolean;
    /** 0 equals ground level, <0 is below ground, >0 is above */
    elevation?: number;
    rotation?: 'auto' | number;
    // TODO: offsets for when multiple units occupy the same node
};

export const GridObjects: Component<{
    geom: BufferGeometry;
    material: Material;
    grid: SurfaceNode[];
    objects: Record<string, GridObjectData>;
    positioning?: GridObjectPositioning;
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

    const states: GridObjectState[] = [];
    const stateIndexByObjectId: Record<string, number> = {};

    const syncStates = (time: number) => {
        const grid = props.grid;
        const objects = props.objects;
        const objectIds = Object.keys(objects);

        const obsoleteObjectIds = new Set(Object.keys(stateIndexByObjectId));

        for (const objectId of objectIds) {
            const { location } = objects[objectId];
            const stateIndex: number | undefined = stateIndexByObjectId[objectId];

            if (stateIndex === undefined) {
                // this is a new object, we should create a state for it
                const newStateIndex = states.length;
                states.push({
                    objectId,
                    location,
                    targetPos: grid[location].position,
                    sourcePos: grid[location].position,
                    interpolationStarted: -1,
                    isDirty: true,
                });
                stateIndexByObjectId[objectId] = newStateIndex;
                continue;
            }

            const state = states[stateIndex];

            // this state already exists and should be appropriately updated
            obsoleteObjectIds.delete(objectId);

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
        for (const obsoleteId of obsoleteObjectIds.values()) {
            const stateIndex = stateIndexByObjectId[obsoleteId];
            delete stateIndexByObjectId[obsoleteId];

            if (stateIndex !== states.length - 1) {
                states[stateIndex] = states[states.length - 1];
                states[stateIndex].isDirty = true;
                stateIndexByObjectId[states[stateIndex].objectId] = stateIndex;
            }

            states.pop();
        }
    };

    const updateInstanced = (time: number) => {
        const instanced = mesh();
        const objects = props.objects;
        const N = Math.min(states.length, props.maxCount ?? DEFAULT_MAX_COUNT);
        const dummy = new Object3D();
        const up = new Vector3(0, 1, 0);

        let needsUpdate = false;

        if (N !== instanced.count) {
            needsUpdate = true;
            instanced.count = N;
        }

        const defaultPositioning = props.positioning ?? { isDirty: false };
        for (let i = 0; i < N; i++) {
            const state = states[i];
            const object = objects[state.objectId];
            const positioning = object.positioning
                ? { ...defaultPositioning, ...object.positioning }
                : defaultPositioning;

            if (!state.isDirty && !positioning.isDirty) {
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
            if (positioning.elevation !== undefined) {
                dummy.position.setLength(dummy.position.length() + positioning.elevation);
            }

            const groundOrientation = new Quaternion().setFromUnitVectors(up, currentPos.clone().normalize());
            const rotation = new Quaternion();

            if (positioning.rotation === 'auto') {
                const targetForward = state.targetPos.clone().sub(state.sourcePos).normalize();

                if (targetForward.lengthSq() > 0.999) {
                    const targetUp = currentPos.clone().normalize();
                    const targetRight = new Vector3().crossVectors(targetUp, targetForward).normalize();
                    targetForward.crossVectors(targetRight, targetUp).normalize();
                    // targetForward.negate();

                    const m = new Matrix4();
                    m.makeBasis(targetRight, targetUp, targetForward);
                    rotation.setFromRotationMatrix(m);
                } else {
                    rotation.copy(groundOrientation);
                }
            } else if (typeof positioning.rotation === 'number') {
                // TODO
            } else {
                rotation.copy(groundOrientation);
            }

            dummy.setRotationFromQuaternion(rotation);

            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);

            if (object.positioning) {
                object.positioning.isDirty = false;
            } else if (defaultPositioning) {
                defaultPositioning.isDirty = false;
            }
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
