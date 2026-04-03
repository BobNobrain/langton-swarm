import { CPU_FNS } from '../systems/cpu';
import { DRILL_FNS, DRILL_SYSTEM_NAME } from '../systems/drill';
import { ENGINE_FNS, ENGINE_SYSTEM_NAME } from '../systems/engine';
import { INVENTORY_FNS, INVENTORY_SYSTEM_NAME } from '../systems/inventory';
import { NAVIGATOR_FNS, NAVIGATOR_SYSTEM_NAME } from '../systems/navigator';
import { SCANNER_FNS, SCANNER_SYSTEM_NAME } from '../systems/scanner';
import type { UnitConfiguration } from '../types';
import type { BsmlValue, BsmlValueType } from './value';

type BuiltinFn = {
    argTypes: BsmlValueType[];
    returnType: BsmlValueType;
};

export function getFunctions(config: UnitConfiguration | null) {
    const result: Record<string, BuiltinFn> = {};
    const add = (namespace: string, name: string, args: BsmlValueType[], ret: BsmlValueType) => {
        result[[namespace, name].filter(Boolean).join('.')] = { argTypes: args, returnType: ret };
    };

    for (const [name, fn] of Object.entries(CPU_FNS)) {
        add('', name, fn.argTypes, fn.returnType);
    }

    if (config?.navigator) {
        for (const [name, fn] of Object.entries(NAVIGATOR_FNS)) {
            add(NAVIGATOR_SYSTEM_NAME, name, fn.argTypes, fn.returnType);
        }
    }

    if (config?.engine) {
        for (const [name, fn] of Object.entries(ENGINE_FNS)) {
            add(ENGINE_SYSTEM_NAME, name, fn.argTypes, fn.returnType);
        }
    }

    if (config?.drill) {
        for (const [name, fn] of Object.entries(DRILL_FNS)) {
            add(DRILL_SYSTEM_NAME, name, fn.argTypes, fn.returnType);
        }
    }

    if (config?.scanner) {
        for (const [name, fn] of Object.entries(SCANNER_FNS)) {
            add(SCANNER_SYSTEM_NAME, name, fn.argTypes, fn.returnType);
        }
    }

    if (config?.storage) {
        for (const [name, fn] of Object.entries(INVENTORY_FNS)) {
            add(INVENTORY_SYSTEM_NAME, name, fn.argTypes, fn.returnType);
        }
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
        if (expected !== actual && actual !== 'magic') {
            return `mismatching types: expected ${expected}, got ${actual}`;
        }
    }

    return null;
}
