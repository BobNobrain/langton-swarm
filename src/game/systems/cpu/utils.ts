import type { BsmlValue } from '@/game/program/value';
import { renderValue } from '@/game/program/utils';
import type { CPUData } from './types';

export function toErrorState(cpu: CPUData, msg: string) {
    const prev: CPUData = {
        ...cpu,
        memory: cpu.memory.slice(),
        memoryVarnames: cpu.memoryVarnames.slice(),
        stack: cpu.stack.slice(),
        waitingForReturn: cpu.waitingForReturn ? { ...cpu.waitingForReturn } : null,
    };
    console.error(msg, prev);

    setState(
        cpu,
        'error',
        [
            { type: 'string', value: msg },
            { type: 'state', value: prev.state },
            { type: 'number', value: prev.ptr },
            { type: 'string', value: prev.stack.map(renderValue).join(', ') },
        ],
        ['message', 'prev', 'ptr', 'stack'],
    );
}

export function setState(cpu: CPUData, state: string, argv: BsmlValue[], debugNames: string[]) {
    cpu.state = state;

    cpu.memory.length = 0;
    cpu.memory.push(...argv);

    cpu.memoryVarnames.length = 0;
    let names = debugNames;
    if (debugNames.length < argv.length) {
        names = new Array(argv.length);
        for (let i = 0; i < argv.length; i++) {
            names[i] = debugNames[i] ?? '??';
        }
    } else if (debugNames.length > argv.length) {
        names = debugNames.slice(0, argv.length);
    }

    cpu.memoryVarnames.push(...names);

    cpu.stack = [];
    cpu.stackSources = [];
    cpu.ptr = cpu.program.stateStarts[state] ?? -1;
    if (cpu.waitingForReturn) {
        cpu.waitingForReturn.ignoreResult = true;
    }

    cpu.programSavedState = null;
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

export function invokeEventHandler(cpu: CPUData, ptr: number) {
    cpu.programSavedState = {
        memory: cpu.memory,
        memoryVarnames: cpu.memoryVarnames,
        ptr: cpu.ptr,
    };

    cpu.ptr = ptr;
    cpu.memory = [];
    cpu.memoryVarnames = [];
}
export function restoreAfterEvent(cpu: CPUData) {
    if (!cpu.programSavedState) {
        return;
    }

    cpu.memory = cpu.programSavedState.memory;
    cpu.memoryVarnames = cpu.programSavedState.memoryVarnames;
    cpu.ptr = cpu.programSavedState.ptr;
    cpu.programSavedState = null;
}
