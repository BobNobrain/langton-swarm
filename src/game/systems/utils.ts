import { typecheckValues } from '../program/functions';
import { namedArguments } from '../program/utils';
import type { BsmlValue } from '../program/value';
import type { NodeId, UnitConfiguration, UnitEnvironment } from '../types';
import type {
    CallableUnitSystemMessages,
    MessageHandlers,
    UnitSystemFunction,
    UnitSystemFunctionCallPayload,
    UnitSystemTickContext,
} from './systems';

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

export type CallableUnitSystemFunctions<Data> = Record<
    string,
    UnitSystemFunction & {
        init: (args: Record<string, BsmlValue>, ctx: UnitSystemTickContext<Data>, env: UnitEnvironment) => boolean;
    }
>;

export function callableUnitSystemHandlers<Data>(
    fns: CallableUnitSystemFunctions<Data>,
): MessageHandlers<Data, CallableUnitSystemMessages> {
    return {
        fcall: {
            handler(payload, ctx, env) {
                const fn = fns[payload.fname];
                if (!fn) {
                    console.error('[WARN] fcall: unknown function', payload);
                    return false;
                }

                const typeError = typecheckValues(payload.argv, fn);
                if (typeError) {
                    console.error('[WARN] fcall: typecheck failed, ' + typeError, payload);
                }

                return fn.init(namedArguments(fn.argNames, payload.argv), ctx, env);
            },
        },
    };
}
