import { typecheckValues } from '../program/functions';
import { namedArguments } from '../program/utils';
import type { BsmlValue } from '../program/value';
import type { UnitEnvironment } from '../types';
import type { MessageHandlers } from './systems';
import type { UnitSystemFunction, UnitSystemTickContext } from './types';

export function returnToCpu(
    ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId'>,
    value: BsmlValue | null,
    delayTicks?: number,
) {
    ctx.sendMessage(
        'cpu',
        {
            event: 'return',
            unitId: ctx.unitId,
            payload: {
                value,
            },
        },
        delayTicks,
    );
}

export type UnitSystemFunctionCallPayload = {
    fname: string;
    argv: BsmlValue[];
};
export type CallableUnitSystemMessages = {
    fcall: UnitSystemFunctionCallPayload;
};

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

export type CallableUnitSystemFunctions<Data, Deps> = Record<
    string,
    UnitSystemFunction & {
        init: (
            args: Record<string, BsmlValue>,
            ctx: UnitSystemTickContext<Data>,
            env: UnitEnvironment,
            deps: Deps,
        ) => boolean;
    }
>;

export function callableUnitSystemHandlers<Data, Deps>(
    deps: Deps,
    fns: CallableUnitSystemFunctions<Data, Deps>,
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

                return fn.init(namedArguments(fn.argNames, payload.argv), ctx, env, deps);
            },
        },
    };
}

export type UnitSystemSchedulePayload<Data> = (
    ctx: UnitSystemTickContext<Data>,
    env: UnitEnvironment,
) => boolean | void;
export type UnitSystemScheduleMessages<Data> = {
    schedule: UnitSystemSchedulePayload<Data>;
};

export function createScheduler<Data>(system: string) {
    return (
        ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId'>,
        task: UnitSystemSchedulePayload<Data>,
        delayTicks: number,
    ) => {
        ctx.sendMessage(
            system,
            {
                event: 'schedule',
                unitId: ctx.unitId,
                payload: task,
            },
            delayTicks,
        );
    };
}

export function schedulerMessageHandlers<Data>(): MessageHandlers<Data, UnitSystemScheduleMessages<Data>> {
    return {
        schedule: {
            handler(payload, ctx, env) {
                return payload(ctx, env) ?? false;
            },
        },
    };
}
