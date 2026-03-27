import { createSignal, type Signal } from 'solid-js';
import type { BlueprintId } from '../deck';
import type { UnitConfiguration, UnitId } from '../types';
import { createUnitSystem, type CreateUnitSystemCommonOptions } from './systems';

export enum UnitModelType {
    Rover = 'rover',
    Mother = 'mother',
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
        [UnitModelType.Rover]: createSignal<UnitId[]>([]),
        [UnitModelType.Mother]: createSignal<UnitId[]>([]),
    };
    const idsByBlueprint: Record<BlueprintId, Signal<UnitId[]>[]> = {};

    const system = createUnitSystem<SignalsSystemData, {}>(opts, {
        name: 'mesh',
        messages: {},

        initialData: (config, state, unitId) => {
            const modelType = getUnitModel(config);
            const [_, rSet] = idsByModelType[modelType];
            rSet((old) => [...old, unitId]);

            return { modelType };
        },
        tick(ctx, env) {
            ctx.sleep();
        },

        finalize(ctx, env) {
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
    if (config.navigator) {
        return UnitModelType.Rover;
    }

    return UnitModelType.Mother;
}
