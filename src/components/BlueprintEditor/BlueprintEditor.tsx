import { createEffect, createMemo, createSignal, Show, type Component } from 'solid-js';
import type { UnitConfiguration, BlueprintController } from '@/game';
import { compile } from '@/game/program/compile';
import { parseProgram } from '@/game/program/parser';
import { useGame } from '@/gameContext';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { Button } from '../Button/Button';
import { Configurator } from '../Configurator/Configurator';
import { Debugger } from '../Debugger/Debugger';
import { ProgramEditor, useProgramEditorController } from '../ProgramEditor/ProgramEditor';
import { SplitView } from '../SplitView/SplitView';
import { BlueprintUnitsList } from './BlueprintUnitsList';
import { useDebuggerData } from './debugger';
import styles from './BlueprintEditor.module.css';

export type BlueprintEditorController = {
    rHasChanges: () => boolean;
    rCanSave: () => boolean;
    getCurrentState: () => UnitConfiguration | null;
    markSaved: () => void;
    reset: () => void;
};

export const BlueprintEditor: Component<{
    blueprint: BlueprintController | null;
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

    const isLastVersion = createMemo(() => {
        if (!props.blueprint) {
            return false;
        }

        return selectedVersionNumber() === props.blueprint.rLastVersion().version;
    });

    const isProgramEditable = isLastVersion;
    const isConfigReadonly = createMemo(() => {
        if (!isLastVersion()) {
            return true;
        }

        return (props.blueprint?.rUnitIds()[selectedVersionNumber()]?.length ?? 0) > 0;
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
                if (!isProgramEditable()) {
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
                return isProgramEditable();
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

    const unitCounts = createMemo(() => {
        const bp = props.blueprint;
        if (!bp) {
            return [];
        }

        const idsByVersion = bp.rUnitIds();
        const lastVersion = bp.rLastVersion().version;
        const lastVersionCount = idsByVersion[lastVersion]?.length ?? 0;

        let totalCount = 0;
        for (const ids of Object.values(idsByVersion)) {
            totalCount += ids.length;
        }
        totalCount -= lastVersionCount;

        return `${lastVersionCount}+${totalCount}`;
    });

    const {
        debuggerCurrentPosition,
        debuggingUnitId,
        rCpuProgram,
        rCpuIsWaiting,
        rCpuPtr,
        rCpuStack,
        rCpuStackSources,
        rStateName,
        rCpuVars,
    } = useDebuggerData();

    return (
        <div class={styles.editor}>
            <header class={styles.tabs}>
                <Button
                    style={ui.rEditorCurrentTab() === 'configurator' ? 'primary' : 'secondary'}
                    onClick={() => ui.setEditorCurrentTab('configurator')}
                >
                    Configuration
                </Button>
                <Button
                    style={ui.rEditorCurrentTab() === 'program' ? 'primary' : 'secondary'}
                    onClick={() => ui.setEditorCurrentTab('program')}
                >
                    Program
                </Button>
                <Button
                    style={ui.rEditorCurrentTab() === 'units' ? 'primary' : 'secondary'}
                    onClick={() => ui.setEditorCurrentTab('units')}
                >
                    Units ({unitCounts()})
                </Button>
            </header>
            <section
                class={styles.tabSection}
                classList={{
                    [styles.visible]: ui.rEditorCurrentTab() === 'configurator',
                }}
            >
                <Configurator
                    value={configuratorValue()}
                    readonly={isConfigReadonly()}
                    onUpdate={(patch) => {
                        if (isConfigReadonly()) {
                            return;
                        }

                        setConfiguratorValue((old) => ({ ...old, ...patch }));
                        setConfigChanged(true);
                    }}
                />
            </section>
            <section
                class={styles.tabSection}
                classList={{
                    [styles.visible]: ui.rEditorCurrentTab() === 'program',
                }}
            >
                <Show
                    when={configuratorValue().program !== undefined}
                    fallback={<div class={styles.noProgramMessage}>This blueprint has no program.</div>}
                >
                    <SplitView
                        initialTopHeight={0.7}
                        top={
                            <ProgramEditor
                                config={configuratorValue()}
                                readonly={!isProgramEditable()}
                                highlightedPosition={debuggerCurrentPosition()}
                                controllerRef={programEditor.ref}
                                onChanged={setProgramChanged}
                            />
                        }
                        bottom={
                            debuggingUnitId() !== null ? (
                                <Debugger
                                    unitId={debuggingUnitId()}
                                    program={rCpuProgram()}
                                    stateName={rStateName()}
                                    ptr={rCpuPtr()}
                                    stack={rCpuStack()}
                                    stackSources={rCpuStackSources()}
                                    waitingFor={rCpuIsWaiting()}
                                    vars={rCpuVars()}
                                />
                            ) : null
                        }
                    />
                </Show>
            </section>
            <section
                class={styles.tabSection}
                classList={{
                    [styles.visible]: ui.rEditorCurrentTab() === 'units',
                }}
            >
                <BlueprintUnitsList blueprint={props.blueprint} />
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
