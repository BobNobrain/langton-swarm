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
            return `<position:${val.value.toString()}>`;

        case 'state':
            return `:${val.value}`;

        case 'blueprint':
            return `<blueprint:${val.value}>`;

        case 'magic':
            return `<${val.name}>`;
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
    magic: Record<string, Extract<BsmlValue, { type: T }>> = {},
): Extract<BsmlValue, { type: T }> | null {
    const val = data[name];

    if (val.type === 'magic') {
        const magicValue = magic[val.name];
        if (!magicValue) {
            console.error('[WARN] extract typed: could not resolve magic value ' + val.name);
            return null;
        }

        return magicValue;
    }

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
