import type { UnitConfiguration } from '../config';
import { ASSEMBLER_FNS, ASSEMBLER_SYSTEM_NAME } from '../systems/assembler';
import { CPU_FNS } from '../systems/cpu';
import { DRILL_FNS, DRILL_SYSTEM_NAME } from '../systems/drill';
import { ENGINE_FNS, ENGINE_SYSTEM_NAME } from '../systems/engine';
import { INVENTORY_FNS, INVENTORY_SYSTEM_NAME } from '../systems/inventory';
import { MARKERS_FNS, MARKERS_SYSTEM_NAME } from '../systems/markers';
import { NAVIGATOR_FNS, NAVIGATOR_SYSTEM_NAME } from '../systems/navigator';
import { SCANNER_FNS, SCANNER_SYSTEM_NAME } from '../systems/scanner';
import type { UnitSystemFunction } from '../systems/types';
import type { BuiltinFn } from './utils';
import type { BsmlValue } from './value';

export function getFunctions(config: UnitConfiguration | null) {
    const result: Record<string, BuiltinFn> = {};
    const add = (
        namespace: string,
        name: string,
        { argNames, argTypes, returnType, description }: UnitSystemFunction,
        available: boolean,
    ) => {
        const fqn = [namespace, name].filter(Boolean).join('.');
        result[fqn] = { name: fqn, argNames, argTypes, returnType, description, available };
    };

    for (const [name, fn] of Object.entries(CPU_FNS)) {
        add('', name, fn, true);
    }

    for (const [name, fn] of Object.entries(MARKERS_FNS)) {
        add(MARKERS_SYSTEM_NAME, name, fn, true);
    }

    const navigatorAvailable = Boolean(config?.navigator);
    for (const [name, fn] of Object.entries(NAVIGATOR_FNS)) {
        add(NAVIGATOR_SYSTEM_NAME, name, fn, navigatorAvailable);
    }

    const engineAvailable = Boolean(config?.engine);
    for (const [name, fn] of Object.entries(ENGINE_FNS)) {
        add(ENGINE_SYSTEM_NAME, name, fn, engineAvailable);
    }

    const drillAvailable = Boolean(config?.drill);
    for (const [name, fn] of Object.entries(DRILL_FNS)) {
        add(DRILL_SYSTEM_NAME, name, fn, drillAvailable);
    }

    const scannerAvailable = Boolean(config?.scanner);
    for (const [name, fn] of Object.entries(SCANNER_FNS)) {
        add(SCANNER_SYSTEM_NAME, name, fn, scannerAvailable);
    }

    const storageAvailable = Boolean(config?.storage);
    for (const [name, fn] of Object.entries(INVENTORY_FNS)) {
        add(INVENTORY_SYSTEM_NAME, name, fn, storageAvailable);
    }

    const assemblerAvailable = Boolean(config?.assembler);
    for (const [name, fn] of Object.entries(ASSEMBLER_FNS)) {
        add(ASSEMBLER_SYSTEM_NAME, name, fn, assemblerAvailable);
    }

    return result;
}

export function typecheckValues(values: BsmlValue[], fn: Pick<BuiltinFn, 'argTypes'>): string | null {
    if (values.length !== fn.argTypes.length) {
        return `wrong number of arguments: expected ${fn.argTypes.length}, found ${values.length}`;
    }

    for (let i = 0; i < values.length; i++) {
        const expected = fn.argTypes[i];
        if (expected === undefined) {
            continue;
        }

        const actual = values[i].type;
        if (expected !== actual) {
            return `mismatching types: expected ${expected}, got ${actual}`;
        }
    }

    return null;
}

export function renderTypeSignature(fn: BuiltinFn): string {
    const argList = fn.argNames.map((name, i) => `${fn.argTypes[i] ?? '??'} ${name}`).join(', ');
    return `${fn.returnType} ${argList ? `(${argList})` : ''}`;
}
