import type { BsmlValue } from '../program/value';
import type { MessageHandlers } from './systems';
import type { UnitSystemTickContext } from './types';

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

export type UnitSystemSchedulePayload<Data> = (ctx: UnitSystemTickContext<Data>) => boolean | void;
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
            handler(payload, ctx) {
                return payload(ctx) ?? false;
            },
        },
    };
}

export function bfsSleepTime(visited: { readonly size: number }): number {
    return Math.floor(visited.size / 20);
}
