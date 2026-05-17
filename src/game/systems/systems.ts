import type { UnitCommand, UnitCommandCall, UnitId } from '../types';
import type { CreateUnitSystemCommonOptions, SpawnOptions, UnitSystem, UnitSystemTickContext } from './types';

type UnitEntry<Data> = {
    unitId: UnitId;
    systemData: Data;
    sleepUntil: number;
};

export type MessageHandlers<Data, MessagePayloads extends Record<string, unknown>> = {
    [key in keyof MessagePayloads]: {
        handler: (payload: MessagePayloads[key], ctx: UnitSystemTickContext<Data>) => boolean;
    };
};

type CreateOptions<Data, MessagePayloads extends Record<string, unknown>> = {
    name: string;
    messages?: MessageHandlers<Data, MessagePayloads>;

    // TODO: move into CPU controller
    queryCommands?: (ctx: UnitSystemTickContext<Data>) => UnitCommand[];
    executeCommand?: (call: UnitCommandCall, ctx: UnitSystemTickContext<Data>) => boolean;
    hasCommand?: (name: string) => boolean;

    tick?: (ctx: UnitSystemTickContext<Data>) => void;
    initialData: (options: SpawnOptions, unitId: UnitId) => Data | null;

    finalize?: (ctx: UnitSystemTickContext<Data>) => void;
};

export function createUnitSystem<Data, MessagePayloads extends Record<string, unknown>>(
    { sendMessage, systems, logicTick }: CreateUnitSystemCommonOptions,
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
    const data = new Map<UnitId, UnitEntry<Data>>();
    const inactiveData = new Map<UnitId, UnitEntry<Data>>();

    const createContext = (entry: UnitEntry<Data>): UnitSystemTickContext<Data> => ({
        unitId: entry.unitId,
        systemData: entry.systemData,
        sleep(ticksFor) {
            if (ticksFor === undefined || ticksFor < 0 || ticksFor === Infinity) {
                data.delete(entry.unitId);
                inactiveData.set(entry.unitId, entry);
                entry.sleepUntil = 0;
                return;
            }

            entry.sleepUntil = logicTick.getCurrentTick() + ticksFor;
        },
        sendMessage,
        system,
    });

    const system: UnitSystem<Data> = {
        name,
        fns: {},

        tick: tick
            ? () => {
                  const currentTick = logicTick.getCurrentTick();
                  for (const entry of data.values()) {
                      if (currentTick < entry.sleepUntil) {
                          continue;
                      }

                      tick(createContext(entry));
                  }
              }
            : () => {},

        create(unitId, options) {
            const initial = initialData(options, unitId);
            if (initial === null || initial === undefined) {
                // no need to create the entity for this system
                return;
            }

            data.set(unitId, {
                unitId,
                systemData: initial,
                sleepUntil: 0,
            });
        },

        activate(unitId, delayTicks) {
            let entry = inactiveData.get(unitId);
            if (!entry && delayTicks === undefined) {
                return;
            }

            if (!entry) {
                entry = data.get(unitId);
            } else {
                inactiveData.delete(unitId);
            }

            if (!entry) {
                return;
            }

            data.set(unitId, entry);
            if (delayTicks !== undefined) {
                entry.sleepUntil = logicTick.getCurrentTick() + delayTicks;
            }
        },
        deactivate(unitId) {
            const entry = data.get(unitId);
            if (!entry) {
                return;
            }

            data.delete(unitId);
            inactiveData.set(unitId, entry);
        },

        remove(unitId) {
            if (finalize) {
                const unitData = data.get(unitId) || inactiveData.get(unitId);
                if (!unitData) {
                    return;
                }

                finalize(createContext(unitData));
            }

            data.delete(unitId);
            inactiveData.delete(unitId);
        },

        has(unitId) {
            return data.has(unitId) || inactiveData.has(unitId);
        },
        getUnitIds() {
            return [...data.keys(), ...inactiveData.keys()];
        },

        getData(unitId) {
            return (data.get(unitId) ?? inactiveData.get(unitId))?.systemData ?? null;
        },

        handleMessage(msg) {
            const handler = messages?.[msg.event];
            if (!handler) {
                return;
            }

            const activeData = data.get(msg.unitId);
            const unitData = activeData ?? inactiveData.get(msg.unitId);

            if (!unitData) {
                return;
            }

            const shouldActivate = handler.handler(msg.payload as never, createContext(unitData));
            if (shouldActivate && !activeData) {
                inactiveData.delete(msg.unitId);
                data.set(msg.unitId, unitData);
            }
        },

        queryCommands(unitId) {
            if (!queryCommands) {
                return [];
            }

            const unitData = data.get(unitId) ?? inactiveData.get(unitId);
            if (!unitData) {
                return [];
            }

            return queryCommands(createContext(unitData));
        },

        handleCommand(unitId, call) {
            if (!executeCommand) {
                return;
            }

            const activeData = data.get(unitId);
            const unitData = activeData ?? inactiveData.get(unitId);
            if (!unitData) {
                console.error(`[WARN] handleCommand: unit not found`, unitId, call);
                return;
            }

            const shouldActivate = executeCommand(call, createContext(unitData));
            if (shouldActivate && !activeData) {
                inactiveData.delete(unitId);
                data.set(unitId, unitData);
                unitData.sleepUntil = 0;
            }
        },

        hasCommand(name) {
            if (hasCommand) {
                return hasCommand(name);
            }

            return false;
        },

        getDebugEntry(unitId) {
            return { active: data.get(unitId), inactive: inactiveData.get(unitId) };
        },
    };

    systems[name] = system;
    return system;
}
