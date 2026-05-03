import { InventoryDelta } from '@/game/inventory';
import type { BsmlValue } from '@/game/program/value';
import type { CPUData } from './types';
import { popStack } from './utils';

export function binop(cpu: CPUData, op: string): BsmlValue | null {
    const [left, right] = popStack(cpu, 2);
    if (!right) {
        return null;
    }

    switch (op) {
        case '==':
            if (left.type !== right.type) {
                return { type: 'flag', value: false };
            }
            if (left.type === 'null') {
                return { type: 'flag', value: true };
            }
            if (left.type === 'inventory') {
                return { type: 'flag', value: InventoryDelta.areEqual(left.value, (right as typeof left).value) };
            }
            return { type: 'flag', value: left.value === (right as typeof left).value };

        case '/=':
            if (left.type !== right.type) {
                return { type: 'flag', value: true };
            }
            if (left.type === 'null') {
                return { type: 'flag', value: false };
            }
            if (left.type === 'inventory') {
                return { type: 'flag', value: !InventoryDelta.areEqual(left.value, (right as typeof left).value) };
            }
            return { type: 'flag', value: left.value !== (right as typeof left).value };

        case '>':
            if (left.type === 'inventory' && right.type === 'inventory') {
                const cmp = InventoryDelta.compare(left.value, right.value);
                return { type: 'flag', value: cmp === '>' };
            }

            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value > right.value,
            };
        case '>=':
            if (left.type === 'inventory' && right.type === 'inventory') {
                const cmp = InventoryDelta.compare(left.value, right.value);
                return { type: 'flag', value: cmp === '>' || cmp === '=' };
            }

            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value >= right.value,
            };
        case '<':
            if (left.type === 'inventory' && right.type === 'inventory') {
                const cmp = InventoryDelta.compare(left.value, right.value);
                return { type: 'flag', value: cmp === '<' };
            }

            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value < right.value,
            };
        case '<=':
            if (left.type === 'inventory' && right.type === 'inventory') {
                const cmp = InventoryDelta.compare(left.value, right.value);
                return { type: 'flag', value: cmp === '<' || cmp === '=' };
            }

            return {
                type: 'flag',
                value: left.type === 'number' && right.type === 'number' && left.value <= right.value,
            };

        case '*':
            if (left.type === 'inventory' && right.type === 'number') {
                return { type: 'inventory', value: InventoryDelta.multiply(left.value, right.value) };
            }
            if (left.type === 'number' && right.type === 'inventory') {
                return { type: 'inventory', value: InventoryDelta.multiply(right.value, left.value) };
            }

            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value * right.value }
                : null;
        case '/':
            if (left.type === 'inventory' && right.type === 'number') {
                return { type: 'inventory', value: InventoryDelta.multiply(left.value, 1 / right.value) };
            }
            if (left.type === 'number' && right.type === 'inventory') {
                return { type: 'inventory', value: InventoryDelta.multiply(right.value, 1 / left.value) };
            }

            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value / right.value }
                : null;
        case '%':
            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value % right.value }
                : null;
        case '+':
            if (left.type === 'inventory' && right.type === 'inventory') {
                return { type: 'inventory', value: InventoryDelta.combine(left.value, right.value) };
            }

            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value + right.value }
                : null;
        case '-':
            if (left.type === 'inventory' && right.type === 'inventory') {
                return {
                    type: 'inventory',
                    value: InventoryDelta.combine(left.value, InventoryDelta.multiply(right.value, -1)),
                };
            }

            return left.type === 'number' && right.type === 'number'
                ? { type: 'number', value: left.value - right.value }
                : null;

        case 'and':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value && right.value }
                : null;
        case 'or':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value || right.value }
                : null;
        case 'xor':
            return left.type === 'flag' && right.type === 'flag'
                ? { type: 'flag', value: left.value !== right.value }
                : null;

        default:
            return null;
    }
}
