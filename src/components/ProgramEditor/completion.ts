import { syntaxTree } from '@codemirror/language';
import {
    completeFromList,
    type Completion,
    type CompletionContext,
    type CompletionResult,
} from '@codemirror/autocomplete';
import type { UnitConfiguration } from '@/game';
import { getFunctions, renderTypeSignature } from '@/game/program/functions';

type Autocomplete = (context: CompletionContext) => CompletionResult | Promise<CompletionResult | null> | null;

export const bsmlAutocomplete =
    (config: UnitConfiguration | null): Autocomplete =>
    (context: CompletionContext) => {
        const rules = {
            suggestDeclarations: true,
            suggestStatements: false,
            suggestExpressions: false,
            suggestTypes: false,
        };

        const tree = syntaxTree(context.state);
        let node = tree.resolve(context.pos, -1);
        let done = false;
        const path: string[] = [];

        while (!done && node.parent && !node.type.isTop) {
            path.push(node.name);
            switch (node.name) {
                case 'StatementBlock':
                    rules.suggestDeclarations = false;
                    rules.suggestStatements = true;
                    rules.suggestExpressions = false;
                    rules.suggestTypes = false;
                    done = true;
                    break;

                case 'Expression':
                case 'ArgumentsList': // can only use expressions in this context
                    rules.suggestExpressions = true;
                    rules.suggestStatements = false;
                    rules.suggestDeclarations = false;
                    rules.suggestTypes = false;
                    done = true;
                    break;

                case 'ArgumentsDeclaration':
                    rules.suggestExpressions = false;
                    rules.suggestStatements = false;
                    rules.suggestDeclarations = false;
                    rules.suggestTypes = true;
                    done = true;
                    break;
            }

            node = node.parent;
        }

        const list: Array<string | Completion> = [];
        if (rules.suggestDeclarations) {
            list.push(
                { label: 'state', type: 'keyword' },
                { label: 'command', type: 'keyword' },
                { label: 'when', type: 'keyword' },
            );
        }
        if (rules.suggestStatements) {
            list.push({ label: 'state', type: 'keyword' }, { label: 'when', type: 'keyword' });
            addFunctions(config, list);
        }
        if (rules.suggestExpressions) {
            list.push({ label: 'random', type: 'variable' }, { label: 'zero', type: 'variable' });
            addFunctions(config, list);
        }
        if (rules.suggestTypes) {
            list.push(
                { label: 'position', type: 'type' },
                { label: 'number', type: 'type' },
                { label: 'flag', type: 'type' },
                { label: 'state', type: 'type' },
                { label: 'blueprint', type: 'type' },
                { label: 'string', type: 'type' },
            );
        }

        return list.length > 0 ? completeFromList(list)(context) : null;
    };

function addFunctions(config: UnitConfiguration | null, into: Array<string | Completion>) {
    const fns = getFunctions(config);
    for (const fn of Object.values(fns)) {
        into.push({ label: fn.name, type: 'function', detail: renderTypeSignature(fn), info: fn.description });
    }
}
