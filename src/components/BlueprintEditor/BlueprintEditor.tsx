import { createEffect, createMemo, createSignal, Show, type Component } from 'solid-js';
import type { UnitConfiguration, BlueprintController } from '@/game';
import { useGame } from '@/gameContext';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { Configurator } from '../Configurator/Configurator';
import { ProgramEditor, useProgramEditorController } from '../ProgramEditor/ProgramEditor';
import styles from './BlueprintEditor.module.css';
import { SplitView } from '../SplitView/SplitView';
import { compile } from '@/game/program/compile';
import { parseProgram } from '@/game/program/parser';
import type { CodePosition } from '@/game/program';
import { Button } from '../Button/Button';

export type BlueprintEditorController = {
    rHasChanges: () => boolean;
    rCanSave: () => boolean;
    getCurrentState: () => UnitConfiguration | null;
    markSaved: () => void;
    reset: () => void;
};

type Tab = 'configurator' | 'program';

export const BlueprintEditor: Component<{
    blueprint: BlueprintController | null;
    highlightedPosition: CodePosition | null;
    controllerRef?: ControllerRef<BlueprintEditorController>;
}> = (props) => {
    const { ui } = useGame();

    const [rProgramChanged, setProgramChanged] = createSignal(false);
    const [rConfigChanged, setConfigChanged] = createSignal(false);

    const selectedVersionNumber = createMemo((): number => {
        const raw = ui.rDeckSelectedVersion();
        if (raw === null) {
            return props.blueprint?.rLastVersion().version ?? -1;
        }

        return raw;
    });

    createEffect(() => {
        const newLastVersion = props.blueprint?.rLastVersion().version;
        if (newLastVersion !== undefined) {
            setProgramChanged(false);
            setConfigChanged(false);
        }
    });

    const selectedVersion = createMemo(() => {
        const blueprint = props.blueprint;
        if (!blueprint) {
            return null;
        }

        const v = ui.rDeckSelectedVersion();
        if (v === null) {
            return props.blueprint?.rLastVersion() ?? null;
        }

        return blueprint.rVersions()[v] ?? null;
    });

    const isReadonly = createMemo(() => {
        if (!props.blueprint) {
            return true;
        }
        return selectedVersionNumber() !== props.blueprint.rLastVersion().version;
    });

    const programEditor = useProgramEditorController();

    const [configuratorValue, setConfiguratorValue] = createSignal<UnitConfiguration>(selectedVersion()?.config ?? {});
    createEffect(() => {
        const selected = selectedVersion();
        if (!selected) {
            return;
        }

        setConfiguratorValue({ ...selected.config });
    });

    provideController(
        {
            getCurrentState() {
                if (isReadonly()) {
                    return null;
                }

                const program = programEditor.rGet().getProgramText();
                const tree = programEditor.rGet().getSyntaxTree()!;
                const parsed = parseProgram(program, tree);
                const compiled = compile(parsed.program);

                const config = configuratorValue();
                const newConfig: UnitConfiguration = {
                    ...config,
                    program: { source: program, parsed: parsed.program, compiled },
                };
                return newConfig;
            },
            rCanSave: createMemo(() => {
                return !isReadonly();
            }),
            rHasChanges: createMemo(() => rProgramChanged() || rConfigChanged()),
            markSaved() {
                setProgramChanged(false);
                setConfigChanged(false);
            },
            reset() {
                const selected = selectedVersion();
                if (!selected) {
                    return;
                }

                setConfiguratorValue({ ...selected.config });
                setConfigChanged(false);
                programEditor.rGet().reset();
            },
        },
        () => props.controllerRef,
    );

    const [selectedTab, setSelectedTab] = createSignal<Tab>('configurator');

    return (
        <div class={styles.editor}>
            <header class={styles.tabs}>
                <Button
                    style={selectedTab() === 'configurator' ? 'primary' : 'secondary'}
                    onClick={() => setSelectedTab('configurator')}
                >
                    Configuration
                </Button>
                <Button
                    style={selectedTab() === 'program' ? 'primary' : 'secondary'}
                    onClick={() => setSelectedTab('program')}
                >
                    Program
                </Button>
            </header>
            <section
                class={styles.tabSection}
                classList={{
                    [styles.visible]: selectedTab() === 'configurator',
                }}
            >
                <Configurator
                    value={configuratorValue()}
                    readonly={isReadonly()}
                    onUpdate={(patch) => {
                        setConfiguratorValue((old) => ({ ...old, ...patch }));
                        setConfigChanged(true);
                    }}
                />
            </section>
            <section
                class={styles.tabSection}
                classList={{
                    [styles.visible]: selectedTab() === 'program',
                }}
            >
                <Show
                    when={configuratorValue().program}
                    fallback={<div class={styles.noProgramMessage}>This blueprint has no program.</div>}
                >
                    <ProgramEditor
                        config={configuratorValue()}
                        readonly={isReadonly()}
                        highlightedPosition={props.highlightedPosition}
                        controllerRef={programEditor.ref}
                        onChanged={setProgramChanged}
                    />
                </Show>
            </section>
        </div>
    );
};

export function useBlueprintEditorController() {
    return createControllerRef<BlueprintEditorController>({
        getCurrentState: () => null,
        rCanSave: () => false,
        rHasChanges: () => false,
        markSaved: () => {},
        reset: () => {},
    });
}
