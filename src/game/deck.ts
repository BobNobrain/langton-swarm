import { createMemo, createSignal } from 'solid-js';
import { sequentialId, type ID } from '@/lib/ids';
import type { UnitConfiguration, UnitId } from './types';

export type BlueprintId = ID<number, 'BlueprintId'>;

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
    rUnitIds: () => Record<number, UnitId[]>;
    rUnitIdsFlat: () => UnitId[];

    lockVersion(v: number): void;
    updateConfiguration(patch: UnitConfiguration): void;
    registerUnit(unitId: UnitId, v: number): void;
    findUnitIdVersion(unitId: UnitId): number | null;
};

type BlueprintControllerFull = BlueprintController & {
    rSetName: (name: string) => void;
    getConfiguration(v: number): UnitConfiguration | null;
};

export type BlueprintDeck = {
    rBlueprints: () => BlueprintController[];

    create(name: string, config: UnitConfiguration): BlueprintController;
    getBlueprint(id: BlueprintId): BlueprintController | null;
    rename(id: BlueprintId, newName: string): void;
    getConfiguration(id: BlueprintId, version: number): UnitConfiguration | null;
    findByName(name: string): BlueprintController | null;
    findByUnitId(unitId: UnitId): { bp: BlueprintController; v: number } | null;
};

export function createBlueprintDeck(): BlueprintDeck {
    const [rCards, rSetCards] = createSignal<Record<number, BlueprintControllerFull>>({});
    const blueprintId = sequentialId<BlueprintId>();

    return {
        rBlueprints: createMemo(() => Object.values(rCards())),

        getBlueprint(id) {
            return rCards()[id];
        },

        create(name, config) {
            const blueprint = createBlueprintController(blueprintId.aquire(), name, config);
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

        findByName(name) {
            return Object.values(rCards()).find((card) => card.rName() === name) ?? null;
        },

        findByUnitId(unitId) {
            for (const card of Object.values(rCards())) {
                const v = card.findUnitIdVersion(unitId);
                if (v !== null) {
                    return { bp: card, v };
                }
            }
            return null;
        },
    };
}

function createBlueprintController(id: BlueprintId, name: string, config: UnitConfiguration): BlueprintControllerFull {
    const [rName, rSetName] = createSignal(name);
    const [rUnitIds, rSetUnitIds] = createSignal<Record<number, UnitId[]>>({});
    let lastVersion = 0;

    const firstVersion: BlueprintVersion = {
        version: lastVersion,
        config,
        locked: false,
    };

    const [rVersions, setRVersions] = createSignal<Record<number, BlueprintVersion>>({
        [lastVersion]: firstVersion,
    });

    const rLastVersion = createMemo(() => {
        return rVersions()[lastVersion];
    });

    const versionNumbersByUnitId: Record<UnitId, number> = {};

    return {
        id,
        rName,
        rSetName,
        rVersions,
        rLastVersion,
        rUnitIds,
        rUnitIdsFlat: createMemo(() => Object.values(rUnitIds()).flat()),

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

        registerUnit(unitId, v) {
            versionNumbersByUnitId[unitId] = v;
            rSetUnitIds((old) => ({ ...old, [v]: (old[v] ?? []).concat([unitId]) }));
        },

        findUnitIdVersion(unitId) {
            return versionNumbersByUnitId[unitId] ?? null;
        },
    };
}
