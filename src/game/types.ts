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
};

export type Planet = {
    nodes: SurfaceNode[];
    nav: NavMesh;
    resources: Map<NodeId, ResourceDeposit>;
};

export type ResourceDeposit = {
    resource: string;
    amount: number;
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

export type UnitConfiguration = {
    /** BSML program for unit's CPU */
    cpu?: string;
    /** Set to true for if the unit is mother */
    mother?: boolean;
    /** Unit's movement characteristics */
    engine?: {
        power: 1 | 2 | 3;
    };
    /** If unit has navigation & movement capabilities */
    navigator?: boolean;
    /** If unit has a scanner to scan for ores */
    drill?: boolean;
    /** If unit has a mineral scanner */
    scanner?: boolean;
    /** Unit storage characteristics */
    storage?: {
        readonly size: number;
    };
    /** Unit battery characteristics */
    battery?: {
        readonly capacity: number;
    };
    /** Construction target (for stationaries) */
    construction?: UnitConfiguration;
};

export type CreateGameProgress = {
    progress: number;
    stage: string;
};
export type CreateGameProgressListener = (p: CreateGameProgress) => void;

export type WorldgenOptions = {
    seed: string;
};
export type WorldgenOptionsInput = Partial<WorldgenOptions>;
