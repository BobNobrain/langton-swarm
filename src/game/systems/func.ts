import { typecheckValues } from '../program/functions';
import { namedArguments } from '../program/utils';
import type { BsmlValue, BsmlValueType } from '../program/value';
import type { UnitEvent, UnitEventData } from './events';
import type { MessageHandlers } from './systems';
import type { UnitSystemFunction, UnitSystemTickContext } from './types';
import { returnToCpu } from './utils';

type USFAction = { type: 'sleep'; ticks: number } | { type: 'wake' } | { type: 'unitevent'; event: UnitEvent<any> };

type USFBody = Generator<USFAction, BsmlValue>;

export type USFCallPayload = {
    fname: string;
    argv: BsmlValue[];
};

export type CallableUnitSystemFunctions<Data, Deps> = Record<
    string,
    UnitSystemFunction & {
        body: (args: Record<string, BsmlValue>, ctx: UnitSystemTickContext<Data>, deps: Deps) => USFBody;
    }
>;

export function typedUSF<Data, Deps, Args extends Record<string, BsmlValueType>>(fn: {
    description: string;
    args: Args;
    returnType: BsmlValueType;
    body: (
        args: {
            [key in keyof Args]: Extract<BsmlValue, { type: Args[key] }>;
        },
        ctx: UnitSystemTickContext<Data>,
        deps: Deps,
    ) => USFBody;
}): CallableUnitSystemFunctions<Data, Deps>[string] {
    return {
        description: fn.description,
        argNames: Object.keys(fn.args),
        argTypes: Object.values(fn.args),
        returnType: fn.returnType,
        body: fn.body as never,
    };
}

export function usfSleep(ticks = 1): USFAction {
    return { type: 'sleep', ticks };
}
export function usfWaitForEvent(event: UnitEvent<any>): USFAction {
    return { type: 'unitevent', event };
}

export type CallableUnitSystemMessages = {
    pfcall: USFBody;
    fcall: USFCallPayload;
};

export function usfHandlers<Data, Deps>(
    fns: CallableUnitSystemFunctions<Data, Deps>,
    deps: Deps,
): MessageHandlers<Data, CallableUnitSystemMessages> {
    return {
        fcall: {
            handler(payload, ctx) {
                const fn = fns[payload.fname];
                if (!fn) {
                    return false;
                }

                const errorMessage = typecheckValues(payload.argv, fn);
                if (errorMessage) {
                    console.error(errorMessage, { call: payload, fn });
                    return false;
                }

                const gen = fn.body(namedArguments(fn.argNames, payload.argv), ctx, deps);
                return step(gen, ctx);
            },
        },
        pfcall: {
            handler: step,
        },
    };
}

function step(gen: USFBody, ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId' | 'system'>): boolean {
    const next = gen.next();
    if (next.done) {
        returnToCpu(ctx, next.value);
        return false;
    }

    if (next.value.type === 'sleep') {
        ctx.sendMessage(ctx.system.name, { event: 'pfcall', payload: gen, unitId: ctx.unitId }, next.value.ticks);
        return false;
    }
    if (next.value.type === 'wake') {
        ctx.sendMessage(ctx.system.name, { event: 'pfcall', payload: gen, unitId: ctx.unitId });
        return true;
    }
    if (next.value.type === 'unitevent') {
        const { event } = next.value;
        const unitId = ctx.unitId;

        const listener = (ev: UnitEventData<any>) => {
            event.unsub(unitId, listener);
            // TODO: somehow pass ev.payload in?
            ctx.sendMessage(ctx.system.name, { event: 'pfcall', payload: gen, unitId });
        };
        event.sub(unitId, listener);
    }

    return false;
}

export function fcall(
    ctx: Pick<UnitSystemTickContext<unknown>, 'sendMessage' | 'unitId'>,
    system: string,
    call: USFCallPayload,
) {
    ctx.sendMessage(system, {
        event: 'fcall',
        unitId: ctx.unitId,
        payload: call,
    });
}
