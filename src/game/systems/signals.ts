import { createSignal, type Signal } from 'solid-js';
import type { BlueprintId } from '../deck';
import type { UnitId } from '../types';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import { isConstructionSite, isPile, type UnitConfiguration } from '../config';

export enum UnitModelType {
    Unknown = 'unknown',
    Rover = 'rover',
    Mother = 'mother',
    Pile = 'pile',
    ConstructionSite = 'constructionSite',
    MiningTower = 'miningTower',
}

type SignalsSystemData = {
    modelType: UnitModelType;
};

export type GameSignals = {
    rIdsByModel: (model: UnitModelType) => () => UnitId[];
    rIdsByBlueprint: (bpId: BlueprintId, bpVersion?: number) => () => UnitId[];
};

export function createSignalsSystem(opts: CreateUnitSystemCommonOptions) {
    // TODO: somehow export these signals
    const idsByModelType: Record<UnitModelType, Signal<UnitId[]>> = {
        [UnitModelType.Unknown]: createSignal<UnitId[]>([]),
        [UnitModelType.Rover]: createSignal<UnitId[]>([]),
        [UnitModelType.Mother]: createSignal<UnitId[]>([]),
        [UnitModelType.Pile]: createSignal<UnitId[]>([]),
        [UnitModelType.ConstructionSite]: createSignal<UnitId[]>([]),
        [UnitModelType.MiningTower]: createSignal<UnitId[]>([]),
    };
    const idsByBlueprint: Record<BlueprintId, Signal<UnitId[]>[]> = {};

    const system = createUnitSystem<SignalsSystemData, {}>(opts, {
        name: 'mesh',

        initialData: ({ config }, unitId) => {
            const modelType = getUnitModel(config);
            const [_, rSet] = idsByModelType[modelType];
            rSet((old) => [...old, unitId]);

            return { modelType };
        },

        finalize(ctx) {
            const [_, rSet] = idsByModelType[ctx.systemData.modelType];
            rSet((old) => old.filter((id) => id !== ctx.unitId));
        },
    });

    return {
        ...system,
        getUnitIdsSignal(model: UnitModelType): () => UnitId[] {
            return idsByModelType[model][0];
        },
    };
}

function getUnitModel(config: UnitConfiguration): UnitModelType {
    if (config.assembler && !config.engine && config.storage) {
        return UnitModelType.Mother;
    }

    if (config.engine) {
        return UnitModelType.Rover;
    }

    if (isPile(config)) {
        return UnitModelType.Pile;
    }

    if (isConstructionSite(config)) {
        return UnitModelType.ConstructionSite;
    }

    if (!config.engine && config.drill) {
        return UnitModelType.MiningTower;
    }

    return UnitModelType.Unknown;
}
