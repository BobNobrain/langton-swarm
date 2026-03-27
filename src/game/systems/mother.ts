import type { BlueprintDeck } from '../deck';
import type { UnitId } from '../types';
import { spawnFromDeck } from '../utils';
import { createUnitSystem, type CreateUnitSystemCommonOptions } from './systems';
import type { SpawnOptions } from './utils';

type MotherData = {
    unitsSpawned: number;
};

export function createMotherSystem(
    opts: CreateUnitSystemCommonOptions,
    {
        deck,
        spawn,
    }: {
        deck: BlueprintDeck;
        spawn: (opts: SpawnOptions) => UnitId;
    },
) {
    return createUnitSystem<MotherData, {}>(opts, {
        name: 'mother',
        messages: {},

        initialData(config, state) {
            if (!config.mother) {
                return null;
            }

            return { unitsSpawned: 0 };
        },
        tick(ctx, env) {
            ctx.sleep();
        },

        queryCommands() {
            return [
                {
                    name: 'spawn',
                    args: [
                        {
                            name: 'blueprint',
                            type: 'blueprint',
                            defaultValue: null,
                        },
                    ],
                },
            ];
        },
        executeCommand(call, ctx, env) {
            switch (call.name) {
                case 'spawn': {
                    const bpid = call.args[0];
                    if (!bpid || bpid.type !== 'blueprint') {
                        break;
                    }

                    spawnFromDeck(deck, { spawn }, ctx.state.location, bpid.value);
                    ctx.systemData.unitsSpawned += 1;
                    break;
                }
            }

            return false;
        },

        hasCommand(name) {
            return name === 'spawn';
        },
    });
}
