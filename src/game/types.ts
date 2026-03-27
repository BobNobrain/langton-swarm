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

export type UnitEnvironment = {
    world: Planet;
    currentTick: number;
    // TBD: other bots locations?
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
    /** set to true for if the unit is mother */
    mother?: boolean;
    /** If unit has navigation & movement capabilities */
    navigator?: boolean;
    /** If unit has a receiver to receive commands */
    receiver?: boolean;
    /** If unit has a scanner to scan for ores */
    scanner?: boolean;
    /** Unit storage characteristics */
    storage?: {
        readonly size: number;
    };
    /** Unit battery characteristics */
    battery: {
        readonly capacity: number;
    };
};
