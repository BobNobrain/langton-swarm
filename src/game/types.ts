import type { Vector3 } from 'three';
import type { ID } from '@/lib/ids';
import type { NavMesh } from '@/lib/NavMesh';
import type { BsmlValue, BsmlValueType } from './program/value';

export type NodeId = ID<number, 'NodeId'>;
export type UnitId = ID<number, 'UnitId'>;

export type SurfaceNode = {
    index: NodeId;
    position: Vector3;
    connections: Set<NodeId>;
    elevation: number;
};

export type ResourceDeposit = {
    resource: string;
    amount: number;
    isDiscovered: boolean;
};

// TODO: maybe just move it to tick context?
export type UnitEnvironment = {
    currentTick: number;
};

export type UnitCommand = {
    name: string;
    args: UnitCommandArg[];
};
export type UnitCommandArg = {
    name: string;
    type: BsmlValueType;
    defaultValue: BsmlValue | null;
};
export type UnitCommandCall = {
    name: string;
    args: BsmlValue[];
};

export type UnitState = {
    location: NodeId;
};

export type CreateGameProgress = {
    progress: number;
    stage: string;
};
export type CreateGameProgressListener = (p: CreateGameProgress) => void;

export type WorldgenOptions = {
    seed: string;
    minSplats: number;
    maxSplats: number;
    maxElevation: number;
};
export type WorldgenOptionsInput = Partial<WorldgenOptions>;
