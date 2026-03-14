import { type SyntaxNode, type Tree } from '@lezer/common';
import type {
    BsmlArgument,
    BsmlCommandDeclaration,
    BsmlEventListener,
    BsmlExpression,
    BsmlFunctionCall,
    BsmlInstruction,
    BsmlProgram,
    BsmlStateDeclaration,
    CodePosition,
} from './program';

type SyntaxError = {
    pos: CodePosition;
    message: string;
};

type CompilationResult = {
    program: BsmlProgram;
    errors: SyntaxError[];
};

type MatcherState = CompilationResult & {
    src: (pos: CodePosition) => string;
};

export function compile(source: string, tree: Tree): CompilationResult {
    const state: MatcherState = {
        program: {
            stateDeclarations: [],
            commandDeclarations: [],
            eventListeners: [],
        },
        errors: [],
        src: (pos) => source.substring(pos.from, pos.to),
    };

    tree.iterate({
        enter: (nodeRef) => {
            if (nodeRef.type.isError) {
                state.errors.push({
                    message: `Syntax error at ${nodeRef.from}-${nodeRef.to}`,
                    pos: { from: nodeRef.from, to: nodeRef.to },
                });
                return false;
            }
        },
    });

    const programRoot = tree.topNode;
    matchProgram(programRoot, state);

    return { program: state.program, errors: state.errors };
}

function matchProgram(root: SyntaxNode, state: MatcherState) {
    matchChildNodes(root, {
        StateDeclaration: (node) => {
            const decl: BsmlStateDeclaration = {
                pos: nodePos(node),
                name: '',
                isDefault: false,
                args: [],
                body: [],
            };
            state.program.stateDeclarations.push(decl);

            matchChildNodes(node, {
                Identifier: (node) => {
                    decl.name = state.src(node);
                },
                ArgumentsDeclaration: (node) => matchArgumentsDeclaration(node, decl.args, state),
                StatementBlock: (node) => {
                    decl.body = matchStatementBlock(node, state);
                },
                Defaultkw: (node) => {
                    decl.isDefault = true;
                },
            });
        },
        CommandDeclaration: (node) => {
            const decl: BsmlCommandDeclaration = {
                pos: nodePos(node),
                name: '',
                args: [],
                body: [],
            };
            state.program.commandDeclarations.push(decl);

            matchChildNodes(node, {
                Identifier: (node) => {
                    decl.name = state.src(node);
                },
                ArgumentsDeclaration: (node) => matchArgumentsDeclaration(node, decl.args, state),
                StatementBlock: (node) => {
                    decl.body = matchStatementBlock(node, state);
                },
            });
        },
        EventDeclaration: (node) => {
            const decl: BsmlEventListener = {
                pos: nodePos(node),
                event: '',
                body: [],
            };
            state.program.eventListeners.push(decl);

            matchChildNodes(node, {
                NestedIdentifier: (node) => {
                    decl.event = state.src(node);
                },
                StatementBlock: (node) => {
                    decl.body = matchStatementBlock(node, state);
                },
            });
        },
    });
}

function matchArgumentsDeclaration(node: SyntaxNode, into: BsmlArgument[], state: MatcherState) {
    matchChildNodes(node, {
        ArgumentDeclaration: (node) => {
            const arg: BsmlArgument = { pos: nodePos(node), name: '', type: '' };

            matchChildNodes(node, {
                Typename: (node) => {
                    arg.type = state.src(node);
                },
                Identifier: (node) => {
                    arg.name = state.src(node);
                },
            });

            into.push(arg);
        },
    });
}

function matchStatementBlock(node: SyntaxNode, state: MatcherState): BsmlInstruction[] {
    const into: BsmlInstruction[] = [];

    matchChildNodes(node, {
        SetStateCommand: (node) => {
            const exprNode = node.getChild('Expression');
            const expr = exprNode ? matchExpression(exprNode, state) : null;

            const instruction: Extract<BsmlInstruction, { type: 'set_state' }> = {
                pos: nodePos(node),
                type: 'set_state',
                state: expr ?? { pos: nodePos(node), type: 'state', stateName: 'idle' },
                args: [],
            };

            into.push(instruction);
        },
        ProcedureCall: (node) => {
            into.push(matchProcCall(node, state));
        },
        VariableAssignment: (node) => {
            const instruction: Extract<BsmlInstruction, { type: 'assign' }> = {
                pos: nodePos(node),
                type: 'assign',
                variable: '',
                value: { pos: nodePos(node), type: 'string', value: '' },
            };

            matchChildNodes(node, {
                Identifier: (node) => {
                    instruction.variable = state.src(node);
                },
                Expression: (node) => {
                    const expr = matchExpression(node, state);
                    if (expr) {
                        instruction.value = expr;
                    }
                },
            });

            into.push(instruction);
        },
        ConditionalStatement: (node) => {
            const instruction: Extract<BsmlInstruction, { type: 'branch' }> = {
                pos: nodePos(node),
                type: 'branch',
                condition: { pos: nodePos(node), type: 'bool', value: false },
                body: [],
            };

            matchChildNodes(node, {
                StatementBlock: (node) => {
                    instruction.body = matchStatementBlock(node, state);
                },
                Expression: (node) => {
                    const expr = matchExpression(node, state);
                    if (expr) {
                        instruction.condition = expr;
                    }
                },
            });

            into.push(instruction);
        },
    });

    return into;
}

function matchExpression(node: SyntaxNode, state: MatcherState): BsmlExpression | null {
    let result: BsmlExpression | null = null;
    matchChildNodes(node, {
        ProcedureCall: (node) => {
            result = matchProcCall(node, state);
        },
        VariableRead: (node) => {
            result = { pos: nodePos(node), type: 'ident', identifier: state.src(node) };
        },
        BoolLiteral: (node) => {
            result = { pos: nodePos(node), type: 'bool', value: state.src(node) === 'yes' };
        },
        StringLiteral: (node) => {
            result = { pos: nodePos(node), type: 'string', value: JSON.parse(state.src(node)) };
        },
        IntegerLiteral: (node) => {
            result = { pos: nodePos(node), type: 'number', value: Number(state.src(node)) };
        },
        StateNameLiteral: (node) => {
            result = { pos: nodePos(node), type: 'state', stateName: state.src(node).substring(1) };
        },
        Expression: (node) => {
            result = matchExpression(node, state);
        },
    });
    return result;
}

function matchProcCall(node: SyntaxNode, state: MatcherState): BsmlFunctionCall & { pos: CodePosition } {
    const call: Extract<BsmlExpression, { type: 'call' }> = {
        pos: nodePos(node),
        type: 'call',
        name: '',
        args: [],
    };
    matchChildNodes(node, {
        NestedIdentifier: (node) => {
            call.name = state.src(node);
        },
        ArgumentsList: (node) => {
            matchChildNodes(node, {
                Expression: (node) => {
                    const expr = matchExpression(node, state);
                    if (expr) {
                        call.args.push(expr);
                    }
                },
            });
        },
    });

    return call;
}

function matchChildNodes(
    node: SyntaxNode,
    matchers: Record<
        string,
        | {
              match: (node: SyntaxNode) => void;
          }
        | ((node: SyntaxNode) => void)
    >,
): void {
    // const unmatched = new Set(Object.keys(matchers));

    for (let next = node.firstChild; next; next = next.nextSibling) {
        const nodeName = next.name;
        const matcher = matchers[nodeName];
        if (!matcher) {
            continue;
        }

        // unmatched.delete(nodeName);
        if (typeof matcher === 'function') {
            matcher(next);
        } else {
            matcher.match(next);
        }
    }
}

function nodePos(node: { from: number; to: number }): CodePosition {
    return { from: node.from, to: node.to };
}
