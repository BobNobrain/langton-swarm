import type { BsmlValue, BsmlValueType } from '../program/value';
import type { UnitCommand, UnitCommandCall, UnitConfiguration, UnitEnvironment, UnitId, UnitState } from '../types';

export type UnitSystemFunction = {
    argNames: string[];
    argTypes: BsmlValueType[];
    returnType: BsmlValueType | null;
};

export type UnitSystemMessage = {
    unitId: UnitId;
    event: string;
    payload: unknown;
};

export type UnitSystemFunctionCallPayload = {
    fname: string;
    argv: BsmlValue[];
};
export type CallableUnitSystemMessages = {
    fcall: UnitSystemFunctionCallPayload;
};

export type UnitSystem<Data> = {
    readonly name: string;
    readonly fns: Record<string, UnitSystemFunction>;

    tick(): void;
    create(unitId: UnitId, config: UnitConfiguration, state: UnitState): void;
    activate(unitId: UnitId): void;
    remove(unitId: UnitId): void;

    has(unitId: UnitId): boolean;
    getData(unitId: UnitId): Data | null;

    handleMessage(msg: UnitSystemMessage): void;

    queryCommands(unitId: UnitId): UnitCommand[];
    handleCommand(unitId: UnitId, cmd: UnitCommandCall): void;
    hasCommand: (name: string) => boolean;
};

export type UnitSystemTickContext<Data> = {
    unitId: UnitId;
    state: Readonly<UnitState>;
    systemData: Data;
    sleep: (ticksFor?: number) => void;
    update: (patch: Partial<UnitState>) => void;
    sendMessage: CreateUnitSystemCommonOptions['sendMessage'];
};

type UnitEntry<Data> = {
    unitId: UnitId;
    systemData: Data;
    sleepUntil: number;
};

export type MessageHandlers<Data, MessagePayloads extends Record<string, unknown>> = {
    [key in keyof MessagePayloads]: {
        handler: (payload: MessagePayloads[key], ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => boolean;
    };
};

type CreateOptions<Data, MessagePayloads extends Record<string, unknown>> = {
    name: string;
    messages: MessageHandlers<Data, MessagePayloads>;

    queryCommands?: (ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => UnitCommand[];
    executeCommand?: (call: UnitCommandCall, ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => boolean;
    hasCommand?: (name: string) => boolean;

    tick: (ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => void;
    initialData: (config: UnitConfiguration, state: UnitState, unitId: UnitId) => Data | null;

    finalize?: (ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => void;
};

export type CreateUnitSystemCommonOptions = {
    env: UnitEnvironment;
    states: Record<UnitId, UnitState>;
    sendMessage(to: string, message: UnitSystemMessage): void;
    updateUnitState(unitId: UnitId, patch: Partial<UnitState>): void;
};

export function createUnitSystem<Data, MessagePayloads extends Record<string, unknown>>(
    { env, states, sendMessage, updateUnitState }: CreateUnitSystemCommonOptions,
    {
        name,
        messages,
        tick,
        initialData,
        finalize,
        executeCommand,
        queryCommands,
        hasCommand,
    }: CreateOptions<Data, MessagePayloads>,
): UnitSystem<Data> {
    const data: Record<UnitId, UnitEntry<Data>> = {};
    const inactiveData: Record<UnitId, UnitEntry<Data>> = {};

    const createContext = (entry: UnitEntry<Data>): UnitSystemTickContext<Data> => ({
        unitId: entry.unitId,
        state: states[entry.unitId],
        systemData: entry.systemData,
        sleep(ticksFor) {
            if (ticksFor === undefined || ticksFor < 0 || ticksFor === Infinity) {
                delete data[entry.unitId];
                inactiveData[entry.unitId] = entry;
                entry.sleepUntil = 0;
                return;
            }

            entry.sleepUntil = env.currentTick + ticksFor;
        },
        update(patch) {
            updateUnitState(entry.unitId, patch);
        },
        sendMessage,
    });

    return {
        name,
        fns: {},

        tick() {
            const entries = Object.values(data);

            for (const entry of entries) {
                if (env.currentTick < entry.sleepUntil) {
                    continue;
                }

                tick(createContext(entry), env);
            }
        },

        create(unitId, config, state) {
            const initial = initialData(config, state, unitId);
            if (!initial) {
                // no need to create the entity for this system
                return;
            }

            data[unitId] = {
                unitId,
                systemData: initial,
                sleepUntil: 0,
            };
        },

        activate(unitId) {
            const entry = inactiveData[unitId];
            if (!entry) {
                return;
            }

            delete inactiveData[unitId];
            data[unitId] = entry;
        },

        remove(unitId) {
            if (finalize) {
                const unitData = data[unitId] || inactiveData[unitId];
                finalize(createContext(unitData), env);
            }

            delete data[unitId];
            delete inactiveData[unitId];
        },

        has(unitId) {
            return Boolean(data[unitId] || inactiveData[unitId]);
        },

        getData(unitId) {
            return (data[unitId] ?? inactiveData[unitId])?.systemData ?? null;
        },

        handleMessage(msg) {
            const handler = messages[msg.event];
            if (!handler) {
                return;
            }

            const activeData = data[msg.unitId];
            const unitData = activeData ?? inactiveData[msg.unitId];

            if (!unitData) {
                return;
            }

            const shouldActivate = handler.handler(msg.payload as never, createContext(unitData), env);
            if (shouldActivate && !activeData) {
                delete inactiveData[msg.unitId];
                data[msg.unitId] = unitData;
                unitData.sleepUntil = 0;
            }
        },

        queryCommands(unitId) {
            if (!queryCommands) {
                return [];
            }

            const unitData = data[unitId] ?? inactiveData[unitId];
            if (!unitData) {
                return [];
            }

            return queryCommands(createContext(unitData), env);
        },

        handleCommand(unitId, call) {
            if (!executeCommand) {
                return;
            }

            const activeData = data[unitId];
            const unitData = activeData ?? inactiveData[unitId];
            if (!unitData) {
                console.error(`[WARN] handleCommand: unit not found`, unitId, call);
                return;
            }

            const shouldActivate = executeCommand(call, createContext(unitData), env);
            if (shouldActivate && !activeData) {
                delete inactiveData[unitId];
                data[unitId] = unitData;
                unitData.sleepUntil = 0;
            }
        },

        hasCommand(name) {
            if (hasCommand) {
                return hasCommand(name);
            }

            return false;
        },
    };
}
