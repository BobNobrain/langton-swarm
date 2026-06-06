import { InventoryDelta } from '../inventory';
import type { UnitCommand } from '../types';
import type { BsmlProgram } from './program';
import type { BsmlValue, BsmlValueType } from './value';

export function isTruthy(val: BsmlValue): boolean {
    switch (val.type) {
        case 'flag':
            return val.value;

        case 'number':
            return val.value !== 0;

        case 'string':
            return val.value.length > 0;

        case 'blueprint':
            return val.value !== 0;

        case 'null':
            return false;

        case 'inventory':
            return val.value.size > 0;

        default:
            return true;
    }
}

export function renderValue(val: BsmlValue | null | undefined): string {
    if (!val) {
        return '<??>';
    }

    switch (val.type) {
        case 'null':
            return '<nothing>';

        case 'flag':
            return val.value ? '<yes>' : '<no>';

        case 'number':
            return val.value.toString();

        case 'string':
            return JSON.stringify(val.value);

        case 'position':
            return `<pos:${val.value.toString()}>`;

        case 'state':
            return `:${val.value}`;

        case 'blueprint':
            return `<blueprint:${val.value}>`;

        case 'inventory':
            return `<inventory:${InventoryDelta.toShortString(val.value)}>`;
    }
}

export function namedArguments(names: string[], values: BsmlValue[]): Record<string, BsmlValue> {
    const result: Record<string, BsmlValue> = {};
    for (let i = 0; i < Math.min(values.length, names.length); i++) {
        result[names[i]] = values[i];
    }
    return result;
}

export function extractTyped<T extends BsmlValueType>(
    data: Record<string, BsmlValue>,
    name: string,
    type: T,
): Extract<BsmlValue, { type: T }> | null {
    const val = data[name];

    if (!val || val.type !== type) {
        return null;
    }

    return val as never;
}

export function getCommandStateName(commandName: string): string {
    return `cmd:${commandName}`;
}
export function isCommandStateName(stateName: string): boolean {
    return stateName.startsWith('cmd:');
}
export function renderStateName(stateName: string | null | undefined): string {
    if (!stateName) {
        return '--';
    }

    if (stateName.includes(':')) {
        return stateName;
    }

    return ':' + stateName;
}

export function extractCommands(program: BsmlProgram): UnitCommand[] {
    return program.commandDeclarations.map(
        (decl): UnitCommand => ({
            name: decl.name,
            args: decl.args.map((arg) => ({ name: arg.name, type: arg.type as BsmlValueType, defaultValue: null })),
        }),
    );
}

export type BuiltinFn = {
    name: string;
    description?: string;
    argNames: string[];
    argTypes: BsmlValueType[];
    returnType: BsmlValueType;
};

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
