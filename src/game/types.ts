import type { Vector3 } from 'three';
import type { BsmlValue, BsmlValueType } from './program/value';

export type NodeId = number;

export type SurfaceNode = {
    index: NodeId;
    position: Vector3;
    connections: Set<NodeId>;
};

export type Planet = {
    nodes: SurfaceNode[];
    resources: Map<NodeId, unknown>;
};

export type UnitData = {
    behaviourState: BehaviourState;
    botState: UnitState;
    config: UnitConfiguration;
};

export type UnitEnvironment = {
    world: Planet;
    // TBD: other bots locations?
};

export type BehaviourTickContext = {
    behaviourState: Readonly<BehaviourState>;
    unitState: Readonly<UnitState>;
    env: Readonly<UnitEnvironment>;

    updateUnit: (patch: Partial<UnitState>) => void;
    setState: (state: string, data: Record<string, BsmlValue>) => void;
    setData: (name: string, value: BsmlValue) => void;
    setInstructionPointer: (newValue: number) => void;
};

export type UnitBehaviour = {
    setup: () => BehaviourState;
    tick: (ctx: BehaviourTickContext) => void;
    getCommands: (ctx: Pick<BehaviourTickContext, 'behaviourState' | 'unitState' | 'env'>) => UnitCommand[];
    executeCommand: (name: string, args: BsmlValue[], ctx: BehaviourTickContext) => void;
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

export type BehaviourState = {
    state: string;
    instructionPointer: number;
    data: Record<string, BsmlValue>;
};

export type UnitState = {
    location: NodeId;
};

export type UnitConfiguration = {
    program?: string;
    navigator?: boolean;
    receiver?: boolean;
    scanner?: boolean;
    storage?: {
        readonly size: number;
    };
    battery: {
        readonly capacity: number;
    };
};
