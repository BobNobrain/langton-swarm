import type { BsmlValue } from '@/game/program/value';
import type { UnitSystemFunction } from '../types';

export const CPU_FNS: Record<
    string,
    UnitSystemFunction & {
        call: (...args: BsmlValue[]) => BsmlValue;
    }
> = {};
