import type { BsmlValue } from '@/game/program/value';
import { renderValue } from '@/game/program/utils';
import type { CPUData } from './types';

export function toErrorState(cpu: CPUData, msg: string) {
    const prev = { ...cpu };
    setState(cpu, 'error');
    cpu.variables.message = { type: 'string', value: msg };
    cpu.variables.prev = { type: 'state', value: prev.state };
    cpu.variables.ptr = { type: 'number', value: prev.ptr };
    cpu.variables.stack = { type: 'string', value: prev.stack.map(renderValue).join(', ') };
}

export function setState(cpu: CPUData, state: string) {
    cpu.state = state;
    cpu.variables = {};
    cpu.stack = [];
    cpu.stackSources = [];
    cpu.ptr = cpu.program.stateStarts[state] ?? -1;
    if (cpu.waitingForReturn) {
        cpu.waitingForReturn.ignoreResult = true;
    }
}

export function popStack(cpu: CPUData, n = 1): BsmlValue[] {
    if (n === 0) {
        return [];
    }

    if (cpu.stack.length < n) {
        toErrorState(cpu, `not enough items in stack: expected ${n}, got ${cpu.stack.length}`);
        return [];
    }

    const result = cpu.stack.slice(-n);
    cpu.stack.length -= n;
    cpu.stackSources.length -= n;
    return result;
}

export function pushToStack(cpu: CPUData, value: BsmlValue, debugSource: string) {
    cpu.stack.push(value);
    cpu.stackSources.push(debugSource);
}
