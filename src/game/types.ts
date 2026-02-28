import type { Vector3 } from 'three';
import type { BsmlValue } from './program/value';

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

export type BotData = {
    behaviourState: BehaviourState;
    botState: BotState;
    config: BotConfiguration;
};

export type BotDataPatch = {
    botState?: Partial<BotState>;
    behaviourState?: Partial<BehaviourState>;
};

export type BotEnvironment = {
    world: Planet;
    // TBD: other bots locations?
};

export type BehaviourTickContext = {
    behaviourState: Readonly<BehaviourState>;
    botState: Readonly<BotState>;
    config: Readonly<BotConfiguration>;
    env: Readonly<BotEnvironment>;

    updateBot: (patch: Partial<BotState>) => void;
    setState: (state: string, data: Record<string, BsmlValue>) => void;
    setData: (name: string, value: BsmlValue) => void;
    setInstructionPointer: (newValue: number) => void;
};

export type BotBehaviour = {
    setup: () => BehaviourState;
    tick: (ctx: BehaviourTickContext) => void;
};

export type BehaviourState = {
    state: string;
    instructionPointer: number;
    data: Record<string, BsmlValue>;
};

export type BotState = {
    location: NodeId;
};

export type BotConfiguration = {
    navigator?: boolean;
    receiver?: boolean;
    storage?: {
        size: number;
    };
    battery: {
        capacity: number;
    };
};

export type BotBlueprint = {
    name: string;
    version: number;
    config: BotConfiguration;
    program: string;
    archived: boolean;
};
