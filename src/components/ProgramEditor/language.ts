import {
    foldNodeProp,
    foldInside,
    indentNodeProp,
    LRLanguage,
    LanguageSupport,
    HighlightStyle,
    syntaxTree,
} from '@codemirror/language';
import { completeFromList, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { styleTags, tags } from '@lezer/highlight';
import { parser } from '@/game/program/bsml';

const parserWithMetadata = parser.configure({
    props: [
        styleTags({
            Identifier: tags.variableName,
            Declkw: tags.definitionKeyword,
            Defaultkw: tags.definitionKeyword,
            Boolkw: tags.bool,
            IntegerLiteral: tags.number,
            StringLiteral: tags.string,
            LineComment: tags.lineComment,
            StateNameLiteral: tags.atom,
            'random zero': tags.standard(tags.name),
            // 'ProcedureCall/NestedIdentifier/Identifier': tags.function(tags.variableName),
            'Typename/Identifier': tags.typeName,
            '( )': tags.paren,
            '{ }': tags.brace,
            '[ ]': tags.squareBracket,
            '. ,': tags.separator,
        }),
        indentNodeProp.add({
            StatementBlock: (context) => context.baseIndent + context.unit,
        }),
        foldNodeProp.add({
            StatementBlock: foldInside,
        }),
    ],
});

const bsmlLanguage = LRLanguage.define({
    parser: parserWithMetadata,
    languageData: {
        commentTokens: { line: '#' },
    },
});

const bsmlCompletion = bsmlLanguage.data.of({
    // autocomplete: ifNotIn(
    //     ['StatementBlock'],
    //     completeFromList([
    //         { label: 'state', type: 'keyword' },
    //         { label: 'command', type: 'keyword' },
    //         { label: 'when', type: 'keyword' },
    //     ]),
    // ),
    autocomplete: (context: CompletionContext) => {
        const rules = {
            suggestDeclarations: true,
            suggestStatemens: false,
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
                    rules.suggestStatemens = true;
                    rules.suggestExpressions = false;
                    rules.suggestTypes = false;
                    done = true;
                    break;

                case 'Expression':
                case 'ArgumentsList': // can only use expressions in this context
                    rules.suggestExpressions = true;
                    rules.suggestStatemens = false;
                    rules.suggestDeclarations = false;
                    rules.suggestTypes = false;
                    done = true;
                    break;

                case 'ArgumentsDeclaration':
                    rules.suggestExpressions = false;
                    rules.suggestStatemens = false;
                    rules.suggestDeclarations = false;
                    rules.suggestTypes = true;
                    done = true;
                    break;
            }

            node = node.parent;
        }

        console.log(path.join('<'), rules);

        const list: Array<string | Completion> = [];
        if (rules.suggestDeclarations) {
            list.push(
                { label: 'state', type: 'keyword' },
                { label: 'command', type: 'keyword' },
                { label: 'when', type: 'keyword' },
            );
        }
        if (rules.suggestStatemens) {
            list.push(
                { label: 'navigator', type: 'namespace' },
                { label: 'drill', type: 'namespace' },
                { label: 'scanner', type: 'namespace' },
                { label: 'state', type: 'keyword' },
                { label: 'when', type: 'keyword' },
            );
        }
        if (rules.suggestExpressions) {
            list.push(
                { label: 'random', type: 'variable' },
                { label: 'zero', type: 'variable' },
                { label: 'navigator', type: 'namespace' },
                { label: 'drill', type: 'namespace' },
                { label: 'scanner', type: 'namespace' },
            );
        }
        if (rules.suggestTypes) {
            list.push(
                { label: 'position', type: 'type' },
                { label: 'direction', type: 'type' },
                { label: 'number', type: 'type' },
                { label: 'flag', type: 'type' },
                { label: 'state', type: 'type' },
                { label: 'scan', type: 'type' },
            );
        }

        return list.length > 0 ? completeFromList(list)(context) : null;
    },
});

export function bsml() {
    return new LanguageSupport(bsmlLanguage, [bsmlCompletion]);
}

enum Color {
    Default = '#f7f7f7',
    Pink = '#f7d3d3',
    Dim = '#b7b7b7',
    Green = '#67b740',
    Yellow = '#e2c43d',
    Blue = '#449edd',
    Purple = '#ab40b7',
    Cyan = '#44a9c2',
}

export const bsmlHighlight = HighlightStyle.define([
    { tag: tags.lineComment, color: Color.Dim, fontStyle: 'italic' },
    { tag: tags.definitionKeyword, color: Color.Green, fontWeight: 600 },
    { tag: tags.bool, color: Color.Yellow },
    { tag: tags.number, color: Color.Blue },
    { tag: tags.string, color: Color.Purple },
    { tag: tags.separator, color: Color.Pink },
    { tag: tags.typeName, color: Color.Cyan },
    { tag: tags.function(tags.variableName), color: Color.Yellow, fontWeight: 500 },
    { tag: tags.atom, color: Color.Pink, fontWeight: 500 },
    { tag: tags.standard(tags.name), color: Color.Pink },
]);
