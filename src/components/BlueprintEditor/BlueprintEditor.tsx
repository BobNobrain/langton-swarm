import { createEffect, createMemo, createSignal, type Component } from 'solid-js';
import type { BotBlueprint, BotConfiguration } from '@/game';
import { ProgramEditor } from '../ProgramEditor/ProgramEditor';
import styles from './BlueprintEditor.module.css';
import { Toggle } from '../Toggle/Toggle';

export const BlueprintEditor: Component<{
    selected: BotBlueprint[];
    onSave: (program: string, configuration: BotConfiguration) => void;
    onClose: () => void;
}> = (props) => {
    const [selectedVersionNumber, setSelectedVersionNumber] = createSignal(props.selected.length - 1);
    createEffect(() => {
        const newLength = props.selected.length;
        setSelectedVersionNumber(newLength);
    });

    const selectedVersion = createMemo(() => {
        if (!props.selected.length) {
            return null;
        }

        return props.selected[selectedVersionNumber() - 1];
    });

    let retrieveProgramText: (() => string) | null = null;

    const [b, setB] = createSignal(true);

    const save = () => {
        if (!retrieveProgramText) {
            return;
        }
        const selected = selectedVersion();
        if (!selected) {
            return;
        }

        const program = retrieveProgramText();
        props.onSave(program, selected.config);
    };

    return (
        <div class={styles.editor}>
            <div class={styles.editorTitleBar}>
                <div class={styles.editorTitle}>{selectedVersion()?.name ?? '--'}</div>
                <div class={styles.editorButtons}>
                    <button class={styles.editorButton} onClick={save}>
                        Save
                    </button>
                    <button
                        class={styles.editorButton}
                        onClick={() => {
                            save();
                            props.onClose();
                        }}
                    >
                        Save & close
                    </button>
                </div>
            </div>
            <div class={styles.configurator}>
                <Toggle value={b()} onUpdate={setB} label="Navigator" />
                <Toggle value={b()} onUpdate={setB} label="Drill" />
                <Toggle value={b()} onUpdate={setB} label="Receiver" />
                <Toggle value={b()} onUpdate={setB} label="Bigger Storage" />
            </div>
            <ProgramEditor
                program={selectedVersion()?.program ?? ''}
                retrieverRef={(r) => {
                    retrieveProgramText = r;
                }}
            />
        </div>
    );
};
