import { FNS } from './functions';
import type { BsmlExpression, BsmlFunctionCall, BsmlInstruction, BsmlProgram, CodePosition } from './program';
import type { BsmlValueType } from './value';

type TypecheckMessage = {
    pos: CodePosition;
    message: string;
    nonCritical?: boolean;
};
type TypecheckState = {
    result: TypecheckMessage[];
    stateArgTypes: Record<string, BsmlValueType[]>;
};
type LocalState = {
    variables: Record<string, BsmlValueType | null>;
};

const MAGIC_IDENTIFIERS = ['random', 'zero'];

export function typecheck(program: BsmlProgram): TypecheckMessage[] {
    const result: TypecheckMessage[] = [];
    const state: TypecheckState = {
        result,
        stateArgTypes: { idle: [], error: [] },
    };

    for (const stateDecl of program.stateDeclarations) {
        if (stateDecl.name === 'idle') {
            result.push({
                pos: stateDecl.pos,
                message: '"idle" is a reserved state name. You cannot define a behaviour for it.',
            });
        } else if (stateDecl.name !== 'error' && state.stateArgTypes[stateDecl.name]) {
            result.push({ pos: stateDecl.pos, message: `State "${stateDecl.name}" has already been declared` });
        }

        state.stateArgTypes[stateDecl.name] = stateDecl.args.map((argDecl) => argDecl.type as BsmlValueType);

        typecheckStatementBlock(stateDecl.body, state, emptyLocalState());
    }

    for (const cmdDecl of program.commandDeclarations) {
        typecheckStatementBlock(cmdDecl.body, state, emptyLocalState());
    }

    for (const eventHandler of program.eventListeners) {
        typecheckStatementBlock(eventHandler.body, state, emptyLocalState());
    }

    return result;
}

function typecheckStatementBlock(block: BsmlInstruction[], state: TypecheckState, localState: LocalState) {
    for (const instruction of block) {
        typecheckInstruction(instruction, state, localState);
    }
}

function typecheckInstruction(instruction: BsmlInstruction, state: TypecheckState, localState: LocalState) {
    switch (instruction.type) {
        case 'set_state': {
            const targetExprType = typecheckExpression(instruction.state, state, localState, 'state');
            if (targetExprType !== 'state') {
                state.result.push({
                    pos: instruction.state.pos,
                    message: `A state name is needed to use with "state" command (found ${targetExprType})`,
                });
            }
            // TODO: check arg types
            break;
        }

        case 'assign':
            if (MAGIC_IDENTIFIERS.includes(instruction.variable)) {
                state.result.push({
                    pos: instruction.pos,
                    message: `"${instruction.variable}" is a reserved variable name, you cannot assign it`,
                });
            } else {
                localState.variables[instruction.variable] = typecheckExpression(
                    instruction.value,
                    state,
                    localState,
                    null,
                );
            }
            break;

        case 'branch': {
            const conditionType = typecheckExpression(instruction.condition, state, localState, 'flag');
            if (conditionType !== 'flag') {
                state.result.push({
                    pos: instruction.condition.pos,
                    message: `This conditional expression has a type ${conditionType ?? '??'}`,
                    nonCritical: true,
                });
            }

            typecheckStatementBlock(instruction.body, state, derivedLocalState(localState));
            break;
        }

        case 'call': {
            typecheckFunctionCall(instruction, state, localState);
        }
    }
}

function typecheckFunctionCall(
    call: { pos: CodePosition } & BsmlFunctionCall,
    state: TypecheckState,
    localState: LocalState,
): BsmlValueType | null {
    const fn = FNS[call.name];
    if (!fn) {
        state.result.push({ pos: call.pos, message: `Unknown function ${call.name}` });
        return null;
    }

    if (fn.argTypes.length !== call.args.length) {
        state.result.push({
            pos: call.pos,
            message: `Wrong argument count for ${call.name} (expected ${fn.argTypes.length})`,
        });
    } else {
        for (let i = 0; i < call.args.length; i++) {
            const type = typecheckExpression(call.args[i], state, localState, fn.argTypes[i]);
            if (type !== fn.argTypes[i]) {
                state.result.push({
                    pos: call.args[i].pos,
                    message: `Type mismatch: expected ${fn.argTypes[i]}, but found ${type ?? '??'}`,
                });
            }
        }
    }

    return fn.returnType ?? null;
}

function typecheckExpression(
    expr: BsmlExpression,
    state: TypecheckState,
    localState: LocalState,
    expectedType: BsmlValueType | null,
): BsmlValueType | null {
    switch (expr.type) {
        case 'bool':
            return 'flag';
        case 'number':
            return 'number';
        case 'string':
            return 'string';

        case 'state':
            if (!state.stateArgTypes[expr.stateName]) {
                state.result.push({ pos: expr.pos, message: `Unknown state name :${expr.stateName}` });
            }
            return 'state';

        case 'ident':
            if (MAGIC_IDENTIFIERS.includes(expr.identifier)) {
                return expectedType;
            }
            return localState.variables[expr.identifier] ?? null;

        case 'call':
            return typecheckFunctionCall(expr, state, localState);
    }
}

function emptyLocalState(): LocalState {
    return { variables: {} };
}
function derivedLocalState(parent: LocalState): LocalState {
    return { variables: { ...parent.variables } };
}
