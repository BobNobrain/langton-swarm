import type { UnitConfiguration } from '../config';
import { getFunctions } from './functions';
import type {
    BsmlArgument,
    BsmlExpression,
    BsmlFunctionCall,
    BsmlInstruction,
    BsmlProgram,
    CodePosition,
} from './program';
import type { BsmlValueType } from './value';

type TypecheckMessage = {
    pos: CodePosition;
    message: string;
    nonCritical?: boolean;
};
type TypecheckState = {
    result: TypecheckMessage[];
    stateArgTypes: Record<string, BsmlValueType[]>;
    fns: ReturnType<typeof getFunctions>;
};
type LocalState = {
    variables: Record<string, BsmlValueType | null>;
};

export function typecheck(program: BsmlProgram, config: UnitConfiguration | null): TypecheckMessage[] {
    const result: TypecheckMessage[] = [];
    const state: TypecheckState = {
        result,
        stateArgTypes: { idle: [], error: [] },
        fns: getFunctions(config),
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
    }

    for (const stateDecl of program.stateDeclarations) {
        typecheckStatementBlock(stateDecl.body, state, localStateWithArgs(stateDecl.args));
    }

    for (const cmdDecl of program.commandDeclarations) {
        typecheckStatementBlock(cmdDecl.body, state, localStateWithArgs(cmdDecl.args));
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
            const targetExprType = typecheckExpression(instruction.state, state, localState);
            if (targetExprType !== 'state') {
                state.result.push({
                    pos: instruction.state.pos,
                    message: `A state name is needed to use with "state" command (found ${targetExprType})`,
                });
            }

            if (instruction.state.type === 'state') {
                const argTypesExpected = state.stateArgTypes[instruction.state.stateName] ?? [];
                typecheckArguments(instruction, argTypesExpected, instruction.args, state, localState);
            } else if (instruction.args.length > 0) {
                state.result.push({
                    pos: instruction.state.pos,
                    message: `To set the state with arguments, you must specify a concrete state name (starting with ':')`,
                });
            }
            break;
        }

        case 'assign':
            localState.variables[instruction.variable] = typecheckExpression(instruction.value, state, localState);
            break;

        case 'branch': {
            const conditionType = typecheckExpression(instruction.condition, state, localState);
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
    const fn = state.fns[call.name];
    if (!fn) {
        state.result.push({ pos: call.pos, message: `Unknown function "${call.name}"` });
        return null;
    }

    typecheckArguments(call, fn.argTypes, call.args, state, localState);
    return fn.returnType;
}

function typecheckArguments(
    fragment: { pos: CodePosition },
    expected: BsmlValueType[],
    actual: BsmlExpression[],
    state: TypecheckState,
    localState: LocalState,
): void {
    if (expected.length !== actual.length) {
        state.result.push({
            pos: fragment.pos,
            message: `Wrong argument count: expected ${expected.length}`,
        });
    } else {
        for (let i = 0; i < actual.length; i++) {
            const type = typecheckExpression(actual[i], state, localState);
            if (type !== expected[i]) {
                state.result.push({
                    pos: actual[i].pos,
                    message: `Type mismatch: expected ${expected[i]}, but found ${type ?? '??'}`,
                });
            }
        }
    }
}

function typecheckExpression(
    expr: BsmlExpression,
    state: TypecheckState,
    localState: LocalState,
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
                state.result.push({
                    pos: expr.pos,
                    message: `Unknown state name :${expr.stateName} (known: ${Object.keys(state.stateArgTypes).join(', ')})`,
                });
            }
            return 'state';

        case 'ident':
            return localState.variables[expr.identifier] ?? null;

        case 'call':
            return typecheckFunctionCall(expr, state, localState);

        case 'unary':
            return typecheckUnaryExpression(expr, state, localState);

        case 'binary':
            return typecheckBinaryExpression(expr, state, localState);
    }
}

function typecheckUnaryExpression(
    expr: Extract<BsmlExpression, { type: 'unary' }>,
    state: TypecheckState,
    localState: LocalState,
): BsmlValueType | null {
    const operandType = typecheckExpression(expr.operand, state, localState);

    switch (expr.operator) {
        case 'not':
            return 'flag';

        case 'size_of':
            checkType(state, expr.operand, operandType, ['inventory']);
            return 'number';

        case '-':
        case '+': {
            checkType(state, expr.operand, operandType, ['number']);
            return 'number';
        }

        default:
            return null;
    }
}

function typecheckBinaryExpression(
    expr: Extract<BsmlExpression, { type: 'binary' }>,
    state: TypecheckState,
    localState: LocalState,
): BsmlValueType | null {
    const leftType = typecheckExpression(expr.left, state, localState);
    const rightType = typecheckExpression(expr.right, state, localState);

    switch (expr.operator) {
        case 'and':
        case 'or':
        case 'xor':
            checkType(state, expr.left, leftType, ['flag']);
            checkType(state, expr.right, rightType, ['flag']);
            return 'flag';

        case '==':
        case '/=':
            return 'flag';

        case '>':
        case '>=':
        case '<':
        case '<=':
            checkType(state, expr.left, leftType, ['number', 'inventory']);
            checkType(state, expr.right, rightType, [leftType ?? 'number']);
            return 'flag';

        case '*':
        case '/':
            checkType(state, expr.left, leftType, ['number', 'inventory']);
            checkType(state, expr.right, rightType, ['number', 'inventory']);
            if (leftType === 'inventory' && rightType === 'inventory') {
                state.result.push({
                    pos: expr.pos,
                    message: `Type mismatch: cannot use two inventories with ${expr.operator} operator (either left or right must be a number)`,
                });
            }
            return leftType === 'inventory' || rightType === 'inventory' ? 'inventory' : 'number';

        case '+':
        case '-':
            checkType(state, expr.left, leftType, ['number', 'inventory']);
            checkType(state, expr.right, rightType, [leftType ?? 'number']);
            return leftType === 'inventory' ? 'inventory' : 'number';

        case '%':
            checkType(state, expr.left, leftType, ['number']);
            checkType(state, expr.right, rightType, ['number']);
            return 'number';

        default:
            return null;
    }
}

function emptyLocalState(): LocalState {
    return { variables: {} };
}
function derivedLocalState(parent: LocalState): LocalState {
    return { variables: { ...parent.variables } };
}
function localStateWithArgs(args: BsmlArgument[]): LocalState {
    const state = emptyLocalState();
    for (const arg of args) {
        state.variables[arg.name] = arg.type as BsmlValueType;
    }
    return state;
}

function checkType(
    state: TypecheckState,
    fragment: { pos: CodePosition },
    actual: BsmlValueType | null,
    expected: BsmlValueType[],
) {
    if (!expected.includes(actual as never)) {
        state.result.push({
            pos: fragment.pos,
            message: `Type mismatch: expected ${expected.join('/')}, got ${actual ?? '??'}`,
        });
    }
}
