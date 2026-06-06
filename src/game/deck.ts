import { createMemo, createSignal } from 'solid-js';
import { sequentialId, type ID } from '@/lib/ids';
import type { UnitConfiguration } from './config';
import type { UnitId } from './types';
import type { FactionId } from './factions';
import type { SavedStateValue } from '@/lib/SavedState';

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

    upgradeToLatest(unitIds: UnitId[]): BlueprintVersion;
};

type BlueprintControllerFull = BlueprintController & {
    rSetName: (name: string) => void;
    getConfiguration(v?: number): UnitConfiguration | null;
};

export type BlueprintDeck = {
    readonly owner: FactionId;

    rBlueprints: () => BlueprintController[];

    create(name: string, config: UnitConfiguration): BlueprintController;
    getBlueprint(id: BlueprintId): BlueprintController | null;
    rename(id: BlueprintId, newName: string): void;
    getConfiguration(id: BlueprintId, version?: number): UnitConfiguration | null;
    findByName(name: string): BlueprintController | null;
    findByUnitId(unitId: UnitId): { bp: BlueprintController; v: number } | null;
    registerUnit(unitId: UnitId, bpId: BlueprintId, v: number): void;
};

const blueprintId = sequentialId<BlueprintId>();

type SaveDataBlueprint = {
    id: BlueprintId;
    name: string;
    versions: BlueprintVersion[];
    versionUnits?: Record<number, UnitId[]>;
};
type SaveData = {
    bps: Record<number, SaveDataBlueprint>;
};

export function createBlueprintDeck(owner: FactionId, savedState: SavedStateValue<SaveData>): BlueprintDeck {
    const [rCards, rSetCards] = createSignal<Record<number, BlueprintControllerFull>>(
        Object.fromEntries(
            Object.entries(savedState.get(() => ({ bps: {} })).bps).map(
                ([idStr, bpData]): [string, BlueprintControllerFull] => {
                    blueprintId.lock(bpData.id);
                    return [idStr, createBlueprintController(bpData)];
                },
            ),
        ),
    );

    savedState.onSave(() => {
        return {
            bps: Object.fromEntries(
                Object.entries(rCards()).map(([idStr, controller]): [string, SaveDataBlueprint] => {
                    return [
                        idStr,
                        {
                            id: controller.id,
                            name: controller.rName(),
                            versions: Object.values(controller.rVersions()),
                            versionUnits: controller.rUnitIds(),
                        },
                    ];
                }),
            ),
        };
    });

    return {
        owner,

        rBlueprints: createMemo(() => Object.values(rCards())),

        getBlueprint(id) {
            return rCards()[id];
        },

        create(name, config) {
            const blueprint = createBlueprintController({
                id: blueprintId.aquire(),
                name,
                versions: [{ version: 0, locked: false, config }],
            });
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

        registerUnit(unitId, bpId, v) {
            const blueprint = rCards()[bpId];
            if (!blueprint) {
                return;
            }

            blueprint.registerUnit(unitId, v);
            blueprint.lockVersion(v);
        },
    };
}

function createBlueprintController({
    id,
    name,
    versions = [],
    versionUnits = {},
}: SaveDataBlueprint): BlueprintControllerFull {
    const [rName, rSetName] = createSignal(name);
    const [rUnitIds, rSetUnitIds] = createSignal<Record<number, UnitId[]>>(versionUnits);
    let lastVersion = 0;

    const initialRVersions: Record<number, BlueprintVersion> = {};
    for (const ver of versions) {
        initialRVersions[ver.version] = ver;
        lastVersion = Math.max(lastVersion, ver.version);
    }

    const [rVersions, setRVersions] = createSignal<Readonly<Record<number, BlueprintVersion>>>(initialRVersions);

    const rLastVersion = createMemo(() => {
        return rVersions()[lastVersion];
    });

    const versionNumbersByUnitId: Record<UnitId, number> = {};

    for (const [vStr, unitIds] of Object.entries(versionUnits)) {
        const v = Number(vStr);
        for (const unitId of unitIds) {
            versionNumbersByUnitId[unitId] = v;
        }
    }

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
            if (v === undefined) {
                return rLastVersion().config;
            }

            return rVersions()[v]?.config ?? null;
        },

        registerUnit(unitId, v) {
            versionNumbersByUnitId[unitId] = v;
            rSetUnitIds((old) => ({ ...old, [v]: (old[v] ?? []).concat([unitId]) }));
        },

        findUnitIdVersion(unitId) {
            return versionNumbersByUnitId[unitId] ?? null;
        },

        upgradeToLatest(unitIds) {
            // warning: this function trusts the caller that these unitIds belong to the blueprint
            const last = rLastVersion();

            rSetUnitIds((old) => {
                const copy = { ...old };

                for (const [vStr, ids] of Object.entries(copy)) {
                    copy[vStr as never] = ids.filter((id) => !unitIds.includes(id));
                }

                copy[last.version] = copy[last.version] ? copy[last.version].concat(unitIds) : unitIds;
                return copy;
            });

            for (const id of unitIds) {
                versionNumbersByUnitId[id] = last.version;
            }

            return last;
        },
    };
}
