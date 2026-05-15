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
    syntaxTree,
} from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
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
import type { UnitConfiguration } from '@/game';
import type { CodePosition } from '@/game/program';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { highlightField, highlightMark, setHighlight } from './highlight';
import { bsml, bsmlHighlight } from './language';
import { bsmlLinter } from './linter';
import styles from './ProgramEditor.module.css';

export type ProgramEditorController = {
    getProgramText: () => string;
    getSyntaxTree: () => ReturnType<typeof syntaxTree> | null;
    reset: () => void;
};

export const ProgramEditor: Component<{
    config: UnitConfiguration | null;
    readonly: boolean;
    highlightedPosition: CodePosition | null;
    controllerRef: ControllerRef<ProgramEditorController>;
    onChanged: (hasChanges: boolean) => void;
}> = (props) => {
    let editorWrapper!: HTMLDivElement;
    let view: EditorView | null = null;
    const readonlyCompartment = new Compartment();
    const languageCompartment = new Compartment();

    onMount(() => {
        view = new EditorView({
            doc: props.config?.program?.source ?? '',
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
                highlightField,

                readonlyCompartment.of(EditorState.readOnly.of(props.readonly)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        props.onChanged(true);
                    }
                }),

                languageCompartment.of([bsml(props.config), bsmlLinter(props.config)]),
            ],
        });

        onCleanup(() => {
            view?.destroy();
            view = null;
        });
    });

    createEffect(() => {
        const program = props.config?.program;
        if (!view || !program) {
            return;
        }

        if (view.state.doc.toString() !== program.source) {
            view.dispatch({
                changes: [
                    {
                        from: 0,
                        to: view.state.doc.length,
                        insert: program.source,
                    },
                ],
            });
        }

        view.dispatch({
            effects: languageCompartment.reconfigure([bsml(props.config), bsmlLinter(props.config)]),
        });

        props.onChanged(false);
    });

    createEffect(() => {
        const isReadonly = props.readonly;
        if (!view) {
            return;
        }

        view.dispatch({
            effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(isReadonly)),
        });
    });

    createEffect(() => {
        const codePos = props.highlightedPosition;
        if (!view) {
            return;
        }

        view.dispatch({
            effects: setHighlight.of(codePos ? highlightMark.range(codePos.from, codePos.to) : null),
        });
    });

    provideController<ProgramEditorController>(
        {
            getProgramText: () => view?.state.doc.toString() ?? '',
            getSyntaxTree: () => (view ? syntaxTree(view.state) : null),
            reset() {
                if (!view) {
                    return;
                }

                view.dispatch({
                    effects: languageCompartment.reconfigure([bsml(props.config), bsmlLinter(props.config)]),
                });
                props.onChanged(false);
            },
        },
        () => props.controllerRef,
    );

    return (
        <div
            class={styles.editorContent}
            ref={editorWrapper}
            on:keydown={(ev) => ev.stopPropagation()}
            on:keyup={(ev) => ev.stopPropagation()}
        ></div>
    );
};

export function useProgramEditorController() {
    return createControllerRef<ProgramEditorController>({
        getProgramText: () => '',
        getSyntaxTree: () => null,
        reset: () => {},
    });
}
