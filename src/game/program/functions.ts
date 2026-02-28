import type { BehaviourTickContext } from '../types';
import type { BsmlValue, BsmlValueType } from './value';

type BuiltinFn = {
    argTypes: BsmlValueType[];
    returnType: BsmlValueType | null;
    call: (values: BsmlValue[], ctx: BehaviourTickContext) => BsmlValue | null;
};

export const FNS: Record<string, BuiltinFn> = {
    'navigator.move': {
        argTypes: ['position'],
        returnType: null,
        call: ([position], ctx) => {
            const pos = position.value as number; // we expect position
            const node = ctx.env.world.nodes[ctx.botState.location];

            if (!node.connections.has(pos)) {
                // TODO: report error somehow?
                return null;
            }

            ctx.updateBot({ location: pos });
            return null;
        },
    },
    'navigator.navigate': {
        argTypes: ['position'],
        returnType: null,
        call: () => {
            return null;
        },
    },
    'drill.mine': {
        argTypes: [],
        returnType: null,
        call: () => {
            return null;
        },
    },
};

export function typecheck(values: BsmlValue[], fn: Pick<BuiltinFn, 'argTypes'>): string | null {
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
