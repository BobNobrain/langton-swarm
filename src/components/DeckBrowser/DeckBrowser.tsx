import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import type { BlueprintController, BlueprintId } from '@/game';
import { BlueprintEditor, useBlueprintEditorController } from '../BlueprintEditor/BlueprintEditor';
import { Button } from '../Button/Button';
import { FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { useExpandedPanel } from '../GameUI';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './DeckBrowser.module.css';

const DeckList: Component<{
    items: BlueprintController[];
    selected: BlueprintId | null;
    onSelect: (id: BlueprintId) => void;
}> = (props) => {
    return (
        <List insetH>
            <For each={props.items} fallback={<ListEmptyContent>You have no blueprints</ListEmptyContent>}>
                {(deckItem) => {
                    return (
                        <ListItem right={<Button>Edit</Button>} onClick={() => props.onSelect(deckItem.id)}>
                            <span class={styles.blueprintName}>{deckItem.rName()}</span>
                            <span class={styles.blueprintVersion}>v.{deckItem.rLastVersion().version}</span>
                        </ListItem>
                    );
                }}
            </For>
        </List>
    );
};

export const DeckBrowser: Component = () => {
    const { deck } = useGame();

    const [getSelectedId, setSelectedId] = createSignal<BlueprintId | null>(null);
    useExpandedPanel(() => getSelectedId() !== null);

    const selectedBlueprint = createMemo(() => {
        const bpId = getSelectedId();
        if (bpId === null) {
            return null;
        }

        return deck.getBlueprint(bpId);
    });

    const editor = useBlueprintEditorController();

    return (
        <>
            <FloatingPanelHeader>
                <Header size="md" withMargin>
                    <Show when={getSelectedId() !== null} fallback="Blueprints">
                        {selectedBlueprint()?.rName()} v.{selectedBlueprint()?.rLastVersion().version ?? '?'}
                    </Show>
                </Header>
                <div class={styles.toolbar}>
                    <Show
                        when={getSelectedId() === null}
                        fallback={
                            <>
                                <Button>Reset</Button>
                                <Show
                                    when={editor.rGet().rHasChanges()}
                                    fallback={<Button onClick={() => setSelectedId(null)}>Close</Button>}
                                >
                                    <Button
                                        style="primary"
                                        disabled={!editor.rGet().rCanSave()}
                                        onClick={() => {
                                            const id = getSelectedId();
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

                                deck.create(name);
                            }}
                        >
                            Create
                        </Button>
                    </Show>
                </div>
            </FloatingPanelHeader>
            <Show
                when={getSelectedId() === null}
                fallback={<BlueprintEditor blueprint={selectedBlueprint()} controllerRef={editor.ref} />}
            >
                <DeckList items={deck.rBlueprints()} selected={getSelectedId()} onSelect={setSelectedId} />
            </Show>
        </>
    );
};
