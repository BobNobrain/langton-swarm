import type { BsmlValue } from '../program/value';
import type { NodeId, UnitConfiguration, UnitId } from '../types';
import type { CreateUnitSystemCommonOptions, UnitSystemFunctionCallPayload, UnitSystemTickContext } from './systems';

export type SpawnOptions = {
    config: UnitConfiguration;
    at: NodeId;
};

export function returnToCpu(
    ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId'>,
    value: BsmlValue | null,
) {
    ctx.sendMessage('cpu', {
        event: 'return',
        unitId: ctx.unitId,
        payload: {
            value,
        },
    });
}

export function fcall(
    ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId'>,
    system: string,
    call: UnitSystemFunctionCallPayload,
) {
    ctx.sendMessage(system, {
        event: 'fcall',
        unitId: ctx.unitId,
        payload: call,
    });
}
