import type { Vector3 } from 'three';

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

export type BotBehaviour = {
    setup: () => BehaviourState;
    tick: (bot: BotData, env: BotEnvironment) => BotDataPatch | null;
};

export type BehaviourState = {
    state: string;
    data: Record<string, unknown>;
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
