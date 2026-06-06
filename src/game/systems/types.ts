import type { SavedStatePartition } from '@/lib/SavedState';
import type { UnitConfiguration } from '../config';
import type { FactionId } from '../factions';
import type { GameLoop } from '../loop';
import type { BsmlValueType } from '../program/value';
import type { NodeId, UnitId } from '../types';
import type { UnitEventController } from './events';
import type { UnitSystem } from './UnitSystem';
import type { BlueprintId } from '../deck';

export type SendMessage = (to: string, message: UnitSystemMessage, delay?: number) => void;

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

export type UnitSystemOrchestrator = {
    sendMessage: SendMessage;
    events: UnitEventController[];
    systems: Record<string, UnitSystem<any, unknown, unknown>>;
    logicTick: GameLoop;
    savedState: SavedStatePartition;
    spawn: SpawnFn;
    despawn: DespawnFn;
};

export type SpawnOptions = {
    config: UnitConfiguration;
    at: NodeId;
    faction: FactionId;
    blueprint: { id: BlueprintId; version: number } | null;
};

export type SpawnFn = (opts: SpawnOptions) => UnitId;
export type DespawnFn = (id: UnitId) => void;

export type DespawnedEventPayload = {
    faction: FactionId;
    config: UnitConfiguration;
};
