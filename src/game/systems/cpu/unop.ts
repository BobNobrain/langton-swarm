import { isTruthy } from '@/game/program/utils';
import type { BsmlValue } from '@/game/program/value';
import type { CPUData } from './types';
import { popStack } from './utils';

export function unop(cpu: CPUData, op: string): BsmlValue | null {
    const [operand] = popStack(cpu);
    if (!operand) {
        return null;
    }

    switch (op) {
        case '-':
            return operand.type === 'number' ? { type: 'number', value: -operand.value } : null;
        case '+':
            return operand.type === 'number' ? { type: 'number', value: -operand.value } : null;

        case 'not':
            return { type: 'flag', value: !isTruthy(operand) };

        case 'size_of':
            return operand.type === 'inventory' ? { type: 'number', value: operand.value.size } : null;

        default:
            return null;
    }
}
