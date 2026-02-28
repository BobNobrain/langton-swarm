import { createEffect, onCleanup, onMount, type Component } from 'solid-js';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentUnit,
} from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
    EditorView,
    keymap,
    highlightSpecialChars,
    drawSelection,
    highlightActiveLine,
    dropCursor,
    rectangularSelection,
    lineNumbers,
    highlightActiveLineGutter,
} from '@codemirror/view';
import { bsml, bsmlHighlight } from './language';
import styles from './ProgramEditor.module.css';
import { bsmlLinter } from './linter';

export const ProgramEditor: Component<{
    program: string;
    retrieverRef: (retrieveProgramText: () => string) => void;
}> = (props) => {
    let editorWrapper!: HTMLDivElement;
    let view: EditorView | null = null;

    onMount(() => {
        view = new EditorView({
            doc: props.program,
            parent: editorWrapper,
            extensions: [
                lineNumbers(),
                foldGutter(),
                highlightSpecialChars(),
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                EditorView.darkTheme.of(true),
                EditorState.tabSize.of(4),
                indentUnit.of('    '),
                indentOnInput(),
                syntaxHighlighting(bsmlHighlight),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                highlightSelectionMatches(),
                keymap.of([
                    // Closed-brackets aware backspace
                    ...closeBracketsKeymap,
                    // A large set of basic bindings
                    ...defaultKeymap,
                    // Redo/undo keys
                    ...historyKeymap,
                    // Code folding bindings
                    ...foldKeymap,
                    // Autocompletion keys
                    ...completionKeymap,
                    indentWithTab,
                ]),

                bsml(),
                bsmlLinter,
            ],
        });

        onCleanup(() => {
            view?.destroy();
            view = null;
        });

        props.retrieverRef(() => view?.state.doc.toString() ?? '');
    });

    createEffect(() => {
        const program = props.program ?? '';
        if (!view || !program) {
            return;
        }

        view.dispatch({
            changes: [
                {
                    from: 0,
                    to: view.state.doc.length,
                    insert: program,
                },
            ],
        });
    });

    return (
        <div
            class={styles.editorContent}
            ref={editorWrapper}
            on:keydown={(ev) => ev.stopPropagation()}
            on:keyup={(ev) => ev.stopPropagation()}
        ></div>
    );
};
