import { createMemo, For, Show, type Component } from 'solid-js';
import { type BlueprintController, type BlueprintId } from '@/game';
import { getConstructionCosts, getConstructionPoints } from '@/game/config';
import { useGame } from '@/gameContext';
import { BlueprintEditor, useBlueprintEditorController } from '../BlueprintEditor/BlueprintEditor';
import { BlueprintLabel } from '../BlueprintLabel/BlueprintLabel';
import { Button } from '../Button/Button';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { InventoryContent } from '../Inventory/Inventory';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import { DeckHeader } from './DeckHeader';
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
            rightClickable
            onClick={() => props.onSelect(props.item.id)}
            bottom={
                <div class={styles.deckItemProperties}>
                    <TimeLabel
                        title="Construction time (on a tier 1 assembler)"
                        ticks={getConstructionPoints(props.item.rLastVersion().config)}
                    />
                    <InventoryContent contents={getConstructionCosts(props.item.rLastVersion().config)} concise />
                </div>
            }
        >
            <div>
                <BlueprintLabel name={props.item.rName()} version={props.item.rLastVersion().version} />
            </div>
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
    const { playerDeck, ui } = useGame();

    const selectedBlueprint = createMemo(() => {
        const bpId = ui.rDeckSelectedBlueprint();
        if (bpId === null) {
            return null;
        }

        return playerDeck.getBlueprint(bpId);
    });

    const editor = useBlueprintEditorController();

    return (
        <FloatingPanel pinRight pinBottom pinTop expandedWidth={ui.rDeckSelectedBlueprint() !== null}>
            <DeckHeader
                bp={selectedBlueprint()}
                canSave={editor.rGet().rCanSave()}
                hasChanges={editor.rGet().rHasChanges()}
                onReset={() => editor.rGet().reset()}
                onSave={() => {
                    const id = ui.rDeckSelectedBlueprint();
                    if (id === null) {
                        return;
                    }

                    const controller = playerDeck.getBlueprint(id);
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
            />
            <Show
                when={ui.rDeckSelectedBlueprint() === null}
                fallback={
                    <div class={styles.editorDebugger}>
                        <BlueprintEditor blueprint={selectedBlueprint()} controllerRef={editor.ref} />
                    </div>
                }
            >
                <DeckList items={playerDeck.rBlueprints()} onSelect={(id) => ui.deckSelectBlueprint(id)} />
                <footer class={styles.footer}>
                    <Button style="text">Show Archived</Button>
                    <Button style="text">Show Library</Button>
                </footer>
            </Show>
        </FloatingPanel>
    );
};
