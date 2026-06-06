import type { BsmlValue } from '@/game/program/value';
import type { UnitSystemFunction } from '../types';
import type { UnitSystemTickContext } from '../UnitSystem';
import type { CPUData, CPUFunctionsDeps } from './types';

export const CPU_FNS: Record<
    string,
    UnitSystemFunction & {
        call: (args: BsmlValue[], ctx: UnitSystemTickContext<CPUData>, deps: CPUFunctionsDeps) => BsmlValue;
    }
> = {
    send_notification: {
        description: 'Sends a notification that will be visible in the top panel',
        argNames: ['message'],
        argTypes: ['string'],
        returnType: 'null',
        call(args, ctx, deps) {
            const msg = args[0]?.type === 'string' ? args[0].value : '<message corrupted>';
            deps.nots.post(ctx.unitId, msg);
            return { type: 'null' };
        },
    },
};
