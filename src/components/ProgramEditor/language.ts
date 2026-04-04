import {
    foldNodeProp,
    foldInside,
    indentNodeProp,
    LRLanguage,
    LanguageSupport,
    HighlightStyle,
} from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';
import type { UnitConfiguration } from '@/game';
import { parser } from '@/game/program/bsml';
import { bsmlAutocomplete } from './completion';

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
            BinOpLogic: tags.operatorKeyword,
            UnaryOp: tags.operatorKeyword,
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

const bsmlCompletion = (config: UnitConfiguration | null) =>
    bsmlLanguage.data.of({
        autocomplete: bsmlAutocomplete(config),
    });

export function bsml(config: UnitConfiguration | null) {
    return new LanguageSupport(bsmlLanguage, [bsmlCompletion(config)]);
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
    { tag: tags.operatorKeyword, color: Color.Yellow, fontWeight: 500 },
]);
