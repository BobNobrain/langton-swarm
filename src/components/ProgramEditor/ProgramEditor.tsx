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
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { bsml, bsmlHighlight } from './language';
import { bsmlLinter } from './linter';
import styles from './ProgramEditor.module.css';

export type ProgramEditorController = {
    getProgramText: () => string;
};

export const ProgramEditor: Component<{
    config: UnitConfiguration | null;
    readonly: boolean;
    controllerRef: ControllerRef<ProgramEditorController>;
    onChanged: (hasChanges: boolean) => void;
}> = (props) => {
    let editorWrapper!: HTMLDivElement;
    let view: EditorView | null = null;
    const readonlyCompartment = new Compartment();
    const linterCompartment = new Compartment();

    onMount(() => {
        view = new EditorView({
            doc: props.config?.cpu ?? '',
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

                readonlyCompartment.of(EditorState.readOnly.of(props.readonly)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        props.onChanged(true);
                    }
                }),

                bsml(),
                linterCompartment.of(bsmlLinter(props.config)),
            ],
        });

        onCleanup(() => {
            view?.destroy();
            view = null;
        });
    });

    createEffect(() => {
        const program = props.config?.cpu ?? '';
        if (!view || !program) {
            return;
        }

        if (view.state.doc.toString() !== program) {
            view.dispatch({
                changes: [
                    {
                        from: 0,
                        to: view.state.doc.length,
                        insert: program,
                    },
                ],
            });
        }

        view.dispatch({
            effects: linterCompartment.reconfigure(bsmlLinter(props.config)),
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

    provideController<ProgramEditorController>(
        {
            getProgramText: () => view?.state.doc.toString() ?? '',
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
    });
}
