import { createMemo, createSignal } from 'solid-js';
import type { UnitConfiguration } from './types';
import { createDefaultUnitConfig } from './config';

export type BlueprintId = number;

export type BlueprintVersion = {
    version: number;
    config: UnitConfiguration;
    locked: boolean;
};

export type BlueprintController = {
    readonly id: BlueprintId;
    rName: () => string;
    rVersions: () => Record<number, BlueprintVersion>;
    rLastVersion: () => BlueprintVersion;

    lockVersion(v: number): void;
    updateConfiguration(patch: UnitConfiguration): void;
};

type BlueprintControllerFull = BlueprintController & {
    rSetName: (name: string) => void;
    getConfiguration(v: number): UnitConfiguration | null;
};

export type BlueprintDeck = {
    rBlueprints: () => BlueprintController[];

    create(name: string): BlueprintController;
    getBlueprint(id: BlueprintId): BlueprintController | null;
    rename(id: BlueprintId, newName: string): void;
    getConfiguration(id: BlueprintId, version: number): UnitConfiguration | null;
};

export function createBlueprintDeck(): BlueprintDeck {
    const [rCards, rSetCards] = createSignal<Record<number, BlueprintControllerFull>>({});
    let idSeq = 1;

    return {
        rBlueprints: createMemo(() => Object.values(rCards())),

        getBlueprint(id) {
            return rCards()[id];
        },

        create(name) {
            const blueprint = createBlueprintController(idSeq++, name);
            rSetCards((old) => ({ ...old, [blueprint.id]: blueprint }));
            return blueprint;
        },

        rename(id, newName) {
            const blueprint = rCards()[id];
            if (!blueprint) {
                return;
            }

            blueprint.rSetName(newName);
        },

        getConfiguration(id, version) {
            const blueprint = rCards()[id];
            if (!blueprint) {
                return null;
            }
            return blueprint.getConfiguration(version);
        },
    };
}

function createBlueprintController(id: BlueprintId, name: string): BlueprintControllerFull {
    const [rName, rSetName] = createSignal(name);
    let lastVersion = 0;

    const firstVersion: BlueprintVersion = {
        version: lastVersion,
        config: createDefaultUnitConfig(),
        locked: false,
    };

    const [rVersions, setRVersions] = createSignal<Record<number, BlueprintVersion>>({
        [lastVersion]: firstVersion,
    });

    const rLastVersion = createMemo(() => {
        return rVersions()[lastVersion];
    });

    return {
        id,
        rName,
        rSetName,
        rVersions,
        rLastVersion,

        updateConfiguration(patch) {
            setRVersions((all) => {
                const last = all[lastVersion];
                const copy: BlueprintVersion = {
                    version: last.version,
                    config: { ...last.config, ...patch },
                    locked: false,
                };

                if (last.locked) {
                    ++lastVersion;
                    copy.version = lastVersion;
                }

                return { ...all, [lastVersion]: copy };
            });
        },

        lockVersion(v) {
            setRVersions((all) => {
                const version = all[v];
                if (!version || version.locked) {
                    return all;
                }

                const copy: BlueprintVersion = {
                    ...version,
                    locked: true,
                };

                return { ...all, [v]: copy };
            });
        },

        getConfiguration(v) {
            return rVersions()[v]?.config ?? null;
        },
    };
}
