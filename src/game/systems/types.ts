import type { BsmlValueType } from '../program/value';
import type { NodeId, UnitConfiguration, UnitEnvironment, UnitId, UnitState } from '../types';
import type { UnitEventController } from './events';

export type SendMessage = (to: string, message: UnitSystemMessage, delay?: number) => void;

export type UnitSystemTickContext<Data> = {
    unitId: UnitId;
    state: Readonly<UnitState>;
    systemData: Data;
    sleep: (ticksFor?: number) => void;
    update: (patch: Partial<UnitState>) => void;
    sendMessage: SendMessage;
};

export type UnitSystemFunction = {
    description?: string;
    argNames: string[];
    argTypes: BsmlValueType[];
    returnType: BsmlValueType;
};

export type UnitSystemMessage = {
    unitId: UnitId;
    event: string;
    payload: unknown;
};

export type CreateUnitSystemCommonOptions = {
    env: UnitEnvironment;
    states: Record<UnitId, UnitState>;
    sendMessage: SendMessage;
    updateUnitState(unitId: UnitId, patch: Partial<UnitState>): void;
    events: UnitEventController[];
};

export type SpawnOptions = {
    config: UnitConfiguration;
    at: NodeId;
};

export type SpawnFn = (opts: SpawnOptions) => UnitId;
export type DespawnFn = (id: UnitId) => void;
