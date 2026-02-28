import type { BehaviourTickContext, BotBehaviour } from '../types';
import { FNS, typecheck } from './functions';
import type { BsmlExpression, BsmlInstruction, BsmlProgram, BsmlStateDeclaration } from './program';
import { evaluateExpression, isTruthy, renderValue, type EvalOptions } from './utils';
import type { BsmlValue, BsmlValueType } from './value';

type StateProgramData = {
    argNames: string[];
    argTypes: string[];
    /** Flat instructions array to be indexed by bot's instructionPointer */
    instructionsFlat: BsmlInstruction[];
    /** Jump points indicate where to jump if the condition evaluates to false */
    jumpPoints: Record<number, number>;
};

export function createRunner(program: BsmlProgram): BotBehaviour {
    const statesByName: Record<string, StateProgramData> = {
        idle: { argNames: [], argTypes: [], instructionsFlat: [], jumpPoints: {} },
        error: { argNames: [], argTypes: [], instructionsFlat: [], jumpPoints: {} },
    };
    let defaultState = 'idle';

    for (const state of program.stateDeclarations) {
        statesByName[state.name] = {
            argNames: state.args.map((arg) => arg.name),
            argTypes: state.args.map((arg) => arg.type),
            instructionsFlat: [],
            jumpPoints: {},
        };

        if (state.isDefault) {
            defaultState = state.name;
        }

        flattenInstructions(state.body, statesByName[state.name]);
    }

    const stateNames = new Set(Object.keys(statesByName));
    const fns = new Set(Object.keys(FNS));
    const evalExpr = (expr: BsmlExpression, ctx: BehaviourTickContext, expectedType?: BsmlValueType) => {
        return evaluateExpression(expr, {
            data: ctx.behaviourState.data,
            states: stateNames,
            fns,
            call: (name, args) => {
                const f = FNS[name];
                if (!f) {
                    reportError(ctx, `function not found: ${name}`);
                    return null;
                }

                const typeError = typecheck(args, f);
                if (typeError) {
                    reportError(ctx, `cannot call ${name}: ${typeError}`);
                    return null;
                }

                return f.call(args, ctx);
            },
            expectedType,
            bot: ctx.botState,
            env: ctx.env,
        });
    };

    const evalArgs = (
        exprs: BsmlExpression[],
        ctx: BehaviourTickContext,
        types: BsmlValueType[],
    ): { ok: true; argv: BsmlValue[] } | { ok: false; msg: string } => {
        if (exprs.length !== types.length) {
            return { ok: false, msg: `wrong argument count: expected ${types.length}, but found ${exprs.length}` };
        }

        const argv: BsmlValue[] = [];
        for (let i = 0; i < exprs.length; i++) {
            const val = evalExpr(exprs[i], ctx, types[i]);
            if (!val) {
                return { ok: false, msg: `could not evaluate argument #${i + 1} (${JSON.stringify(exprs[i])}` };
            }

            argv.push(val);
        }
        return { ok: true, argv };
    };

    return {
        setup: () => ({ state: defaultState, instructionPointer: 0, data: {} }),
        tick: (ctx) => {
            const stateData = statesByName[ctx.behaviourState.state];
            if (!stateData) {
                reportError(ctx, `unknown state: ${ctx.behaviourState}`);
                return;
            }

            if (!stateData.instructionsFlat.length) {
                return;
            }

            let ptr = ctx.behaviourState.instructionPointer;
            if (ptr >= stateData.instructionsFlat.length) {
                ptr = 0;
            }

            const nextInstruction = stateData.instructionsFlat[ptr];

            switch (nextInstruction.type) {
                case 'set_state': {
                    const state = evalExpr(nextInstruction.state, ctx, 'state');
                    if (state === null || state.type !== 'state') {
                        reportError(ctx, `cannot set state to ${renderValue(state)}`);
                        return;
                    }

                    const stateData = statesByName[state.value];
                    const argNames = stateData?.argNames ?? [];
                    const argTypes = stateData?.argTypes ?? [];
                    const evaledArgs = evalArgs(nextInstruction.args, ctx, argTypes as BsmlValueType[]);
                    if (!evaledArgs.ok) {
                        reportError(ctx, evaledArgs.msg);
                        return;
                    }

                    const data: Record<string, BsmlValue> = {};
                    for (let i = 0; i < Math.min(evaledArgs.argv.length, argNames.length); i++) {
                        data[argNames[i]] = evaledArgs.argv[i];
                    }

                    ctx.setState(state.value, data);
                    // no need to set the instruction pointer when switching states
                    break;
                }

                case 'assign': {
                    const value = evalExpr(nextInstruction.value, ctx);
                    if (value === null) {
                        reportError(ctx, `could not evaluate expression to assign ${nextInstruction.variable}`);
                        return;
                    }

                    ctx.setData(nextInstruction.variable, value);
                    ctx.setInstructionPointer(ptr + 1);
                    break;
                }

                case 'call': {
                    const fn = FNS[nextInstruction.name];
                    if (!fn) {
                        reportError(ctx, `tried to call unknown function ${nextInstruction.name}`);
                        return;
                    }

                    const evaledArgs = evalArgs(nextInstruction.args, ctx, fn.argTypes);
                    if (!evaledArgs.ok) {
                        reportError(ctx, evaledArgs.msg);
                        return;
                    }

                    fn.call(evaledArgs.argv, ctx);

                    ctx.setInstructionPointer(ptr + 1);
                    break;
                }

                case 'branch': {
                    const condition = evalExpr(nextInstruction.condition, ctx, 'flag');
                    if (condition === null) {
                        reportError(ctx, `could not evaluate condition`);
                        return;
                    }

                    if (isTruthy(condition)) {
                        ctx.setInstructionPointer(ptr + 1);
                    } else {
                        const jump = stateData.jumpPoints[ptr];
                        if (jump === undefined) {
                            reportError(ctx, `nowhere to jump from ${ptr}`);
                            return;
                        }

                        ctx.setInstructionPointer(jump);
                    }
                    break;
                }
            }
        },
    };
}

function flattenInstructions(block: BsmlInstruction[], result: StateProgramData) {
    for (const instruction of block) {
        switch (instruction.type) {
            case 'branch': {
                const currentPos = result.instructionsFlat.length;
                result.instructionsFlat.push(instruction);
                flattenInstructions(instruction.body, result);
                result.jumpPoints[currentPos] = result.instructionsFlat.length;
                break;
            }

            default:
                result.instructionsFlat.push(instruction);
                break;
        }
    }
}

function reportError(ctx: BehaviourTickContext, msg: string) {
    ctx.setState('error', { error: { type: 'string', value: msg } });
}
