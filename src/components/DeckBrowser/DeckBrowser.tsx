import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { type BlueprintController, type BlueprintId, createDefaultUnitConfig, type UnitId } from '@/game';
import { BlueprintEditor, useBlueprintEditorController } from '../BlueprintEditor/BlueprintEditor';
import { Button } from '../Button/Button';
import { Debugger } from '../Debugger/Debugger';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { Select, type SelectOption } from '../Select/Select';
import styles from './DeckBrowser.module.css';

const DeckListItem: Component<{
    item: BlueprintController;
    onSelect: (id: BlueprintId) => void;
}> = (props) => {
    const { ui } = useGame();

    const unitCounts = createMemo(() => {
        const ids = props.item.rUnitIds();
        const versions = props.item.rVersions();
        const lastVersion = props.item.rLastVersion();

        let totalUnits = 0;
        let currentVersionUnits = 0;

        for (const version of Object.keys(versions)) {
            const v = Number(version);
            const nUnits = (ids[v] ?? []).length;
            totalUnits += nUnits;
            if (v === lastVersion.version) {
                currentVersionUnits += nUnits;
            }
        }

        if (totalUnits === currentVersionUnits) {
            return currentVersionUnits.toString();
        }

        return `${currentVersionUnits} (+${totalUnits - currentVersionUnits})`;
    });

    return (
        <ListItem
            right={
                <Button
                    onClick={() => {
                        ui.selectUnits(Object.values(props.item.rUnitIds()).flat());
                    }}
                >
                    Select {unitCounts()}
                </Button>
            }
            onMainClick={() => props.onSelect(props.item.id)}
        >
            <span class={styles.blueprintName}>{props.item.rName()}</span>
            <span class={styles.blueprintVersion}>v.{props.item.rLastVersion().version}</span>
        </ListItem>
    );
};

const DeckList: Component<{
    items: BlueprintController[];
    onSelect: (id: BlueprintId) => void;
}> = (props) => {
    const itemsReversed = createMemo(() => props.items.toReversed());

    return (
        <List insetH>
            <For each={itemsReversed()} fallback={<ListEmptyContent>You have no blueprints</ListEmptyContent>}>
                {(deckItem) => {
                    return <DeckListItem item={deckItem} onSelect={props.onSelect} />;
                }}
            </For>
        </List>
    );
};

export const DeckBrowser: Component = () => {
    const { deck, ui } = useGame();

    const selectedBlueprint = createMemo(() => {
        const bpId = ui.rDeckSelectedBlueprint();
        if (bpId === null) {
            return null;
        }

        return deck.getBlueprint(bpId);
    });

    const editor = useBlueprintEditorController();

    const versionOptions = createMemo((): SelectOption<number>[] => {
        const bp = selectedBlueprint();
        if (!bp) {
            return [];
        }

        return Object.values(bp.rVersions())
            .map(
                (version): SelectOption<number> => ({
                    text: 'v' + version.version.toFixed(0),
                    value: version.version,
                }),
            )
            .sort((a, b) => b.value - a.value);
    });
    const selectedVersionOption = createMemo((): SelectOption<number> | null => {
        const selected = ui.rDeckSelectedVersion() ?? selectedBlueprint()?.rLastVersion().version;
        return versionOptions().find((option) => option.value === selected) ?? null;
    });

    const debuggingUnitId = createMemo((): UnitId | null => {
        const openBlueprint = ui.rDeckSelectedBlueprint();
        if (openBlueprint === null) {
            return null;
        }

        const selectedIds = ui.rSelectedUnits();
        if (selectedIds.length !== 1) {
            return null;
        }

        const found = deck.findByUnitId(selectedIds[0]);
        if (!found) {
            return null;
        }

        if (found.bp.id !== openBlueprint || found.v !== ui.rDeckSelectedVersion()) {
            return null;
        }

        if (!found.bp.rVersions()[found.v]?.config.cpu) {
            return null;
        }

        return selectedIds[0];
    });

    return (
        <FloatingPanel pinRight pinBottom pinTop expandedWidth={ui.rDeckSelectedBlueprint() !== null}>
            <FloatingPanelHeader>
                <Header size="md" withMargin>
                    <Show when={ui.rDeckSelectedBlueprint() !== null} fallback="Blueprints">
                        {selectedBlueprint()?.rName()} v.{selectedBlueprint()?.rLastVersion().version ?? '?'}
                    </Show>
                </Header>
                <div class={styles.toolbar}>
                    <Show
                        when={ui.rDeckSelectedBlueprint() === null}
                        fallback={
                            <>
                                <Select
                                    value={selectedVersionOption()}
                                    options={versionOptions()}
                                    onUpdate={(option) => {
                                        ui.deckSelectVersion(option.value);
                                    }}
                                    dark
                                    popupOpening="manual"
                                />
                                <Button>Reset</Button>
                                <Show
                                    when={editor.rGet().rHasChanges()}
                                    fallback={<Button onClick={ui.deckUnselectBlueprint}>Close</Button>}
                                >
                                    <Button
                                        style="primary"
                                        disabled={!editor.rGet().rCanSave()}
                                        onClick={() => {
                                            const id = ui.rDeckSelectedBlueprint();
                                            if (id === null) {
                                                return;
                                            }

                                            const controller = deck.getBlueprint(id);
                                            if (!controller) {
                                                return;
                                            }

                                            const config = editor.rGet().getCurrentState();
                                            if (!config) {
                                                return;
                                            }

                                            controller.updateConfiguration(config);
                                            editor.rGet().markSaved();
                                        }}
                                    >
                                        Save
                                    </Button>
                                </Show>
                            </>
                        }
                    >
                        <Button>Import...</Button>
                        <Button
                            style="primary"
                            onClick={() => {
                                const name = prompt('Blueprint name:');
                                if (!name) {
                                    return;
                                }

                                deck.create(name, createDefaultUnitConfig());
                            }}
                        >
                            Create
                        </Button>
                    </Show>
                </div>
            </FloatingPanelHeader>
            <Show
                when={ui.rDeckSelectedBlueprint() === null}
                fallback={
                    <div
                        class={styles.editorDebugger}
                        classList={{
                            [styles.hasDebugger]: debuggingUnitId() !== null,
                        }}
                    >
                        <BlueprintEditor blueprint={selectedBlueprint()} controllerRef={editor.ref} />
                        <Show when={debuggingUnitId() !== null}>
                            <Debugger unitId={debuggingUnitId()} />
                        </Show>
                    </div>
                }
            >
                <DeckList items={deck.rBlueprints()} onSelect={(id) => ui.deckSelectBlueprint(id)} />
            </Show>
        </FloatingPanel>
    );
};
