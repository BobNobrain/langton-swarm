import { randomElement } from '@/lib/random';
import type { UnitEnvironment, UnitState } from '../types';
import type { BsmlExpression } from './program';
import type { BsmlValue, BsmlValueType } from './value';

export type EvalOptions = {
    states?: Set<string>;
    data?: Record<string, BsmlValue>;
    expectedType?: BsmlValueType;

    fns?: Set<string>;
    call?: (name: string, args: BsmlValue[]) => BsmlValue | null;

    env?: UnitEnvironment;
    bot?: UnitState;
};

export function evaluateExpression(expr: BsmlExpression, opts: EvalOptions = {}): BsmlValue | null {
    switch (expr.type) {
        case 'bool':
            return { type: 'flag', value: expr.value };

        case 'string':
            return { type: 'string', value: expr.value };

        case 'number':
            return { type: 'number', value: expr.value };

        case 'state':
            return { type: 'state', value: expr.stateName };

        case 'ident': {
            switch (expr.identifier) {
                case 'random':
                    return createRandomValue(opts);

                case 'zero':
                    return createZeroValue(opts);
            }

            if (opts.data && opts.data[expr.identifier]) {
                return opts.data[expr.identifier];
            }

            return null;
        }

        case 'call':
            if (opts.fns && opts.call && opts.fns.has(expr.name)) {
                const evaluatedArgs = expr.args.map((innerExpr) => evaluateExpression(innerExpr, opts));

                if (evaluatedArgs.some((v) => v === null)) {
                    return null;
                }

                return opts.call(expr.name, evaluatedArgs as BsmlValue[]);
            }

            return null;
    }
}

function createRandomValue({ expectedType, states, env, bot }: EvalOptions): BsmlValue | null {
    switch (expectedType) {
        case 'flag':
            return { type: 'flag', value: Math.random() < 0.5 ? true : false };

        case 'state':
            return states ? { type: 'state', value: randomElement(Math.random, states) } : null;

        case 'position':
            if (env && bot) {
                const node = env.world.nodes[bot.location];
                return { type: 'position', value: randomElement(Math.random, node.connections) };
            }

            return null;

        default:
            return null;
    }
}

function createZeroValue({ expectedType, bot }: EvalOptions): BsmlValue | null {
    switch (expectedType) {
        case 'flag':
            return { type: 'flag', value: false };

        case 'state':
            return { type: 'state', value: 'idle' };

        case 'position':
            if (bot) {
                return { type: 'position', value: bot?.location };
            }

            return null;

        case 'number':
            return { type: 'number', value: 0 };

        case 'string':
            return { type: 'string', value: '' };

        default:
            return null;
    }
}

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

export function renderValue(val: BsmlValue | null): string {
    if (!val) {
        return '<null>';
    }

    switch (val.type) {
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
    }
}

export function namedArguments(names: string[], values: BsmlValue[]): Record<string, BsmlValue> {
    const result: Record<string, BsmlValue> = {};
    for (let i = 0; i < Math.min(values.length, names.length); i++) {
        result[names[i]] = values[i];
    }
    return result;
}
