import { CPU_FNS } from '../systems/cpu';
import { NAVIGATOR_FNS } from '../systems/navigator';
import type { UnitConfiguration } from '../types';
import type { BsmlValue, BsmlValueType } from './value';

type BuiltinFn = {
    argTypes: BsmlValueType[];
    returnType: BsmlValueType | null;
};

export function getFunctions(config: UnitConfiguration | null) {
    const result: Record<string, BuiltinFn> = {};
    const add = (namespace: string, name: string, args: BsmlValueType[], ret: BsmlValueType | null) => {
        result[[namespace, name].filter(Boolean).join('.')] = { argTypes: args, returnType: ret };
    };

    for (const [name, fn] of Object.entries(CPU_FNS)) {
        add('', name, fn.argTypes, fn.returnType);
    }

    if (config?.navigator ?? true) {
        for (const [name, fn] of Object.entries(NAVIGATOR_FNS)) {
            add('navigator', name, fn.argTypes, fn.returnType);
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
