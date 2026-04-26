import type { UnitConfiguration } from '../config';
import type { BsmlValueType } from '../program/value';
import type { NodeId, UnitCommand, UnitCommandCall, UnitEnvironment, UnitId } from '../types';
import type { UnitEventController } from './events';

export type SendMessage = (to: string, message: UnitSystemMessage, delay?: number) => void;

export type UnitSystemTickContext<Data> = {
    unitId: UnitId;
    systemData: Data;
    sleep: (ticksFor?: number) => void;
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
    sendMessage: SendMessage;
    events: UnitEventController[];
    systems: Record<string, UnitSystem<unknown>>;
};

export type SpawnOptions = {
    config: UnitConfiguration;
    at: NodeId;
};

export type SpawnFn = (opts: SpawnOptions) => UnitId;
export type DespawnFn = (id: UnitId) => void;

export type UnitSystemPublic<Data> = {
    readonly name: string;
    readonly fns: Record<string, UnitSystemFunction>;
    getData(unitId: UnitId): Data | null;
    getUnitIds(): UnitId[];
};

export type UnitSystem<Data> = UnitSystemPublic<Data> & {
    tick(): void;
    create(unitId: UnitId, options: SpawnOptions): void;
    activate(unitId: UnitId): void;
    deactivate(unitId: UnitId): void;
    remove(unitId: UnitId): void;

    has(unitId: UnitId): boolean;
    handleMessage(msg: UnitSystemMessage): void;

    queryCommands(unitId: UnitId): UnitCommand[];
    handleCommand(unitId: UnitId, cmd: UnitCommandCall): void;
    hasCommand: (name: string) => boolean;

    getDebugEntry(unitId: UnitId): unknown;
};
