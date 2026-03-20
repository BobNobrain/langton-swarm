import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import type { BlueprintController, BlueprintId, SwarmUnitId } from '@/game';
import { BlueprintEditor, useBlueprintEditorController } from '../BlueprintEditor/BlueprintEditor';
import { Button } from '../Button/Button';
import { FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { useExpandedPanel } from '../GameUI';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './DeckBrowser.module.css';
import { rGetUnitIdsByBlueprint } from '@/game/utils';
import { createDefaultUnitConfig } from '@/game/config';

const DeckListItem: Component<{
    item: BlueprintController;
    onSelect: (id: BlueprintId) => void;
}> = (props) => {
    const { swarms, ui } = useGame();

    const unitCounts = createMemo(() => {
        // TODO: this is not reactive; so when new swarm is created, this memo is no longer valid
        const swarmIds = swarms.findSwarms(props.item.id);
        let totalUnits = 0;
        let currentVersionUnits = 0;

        for (const swarmId of swarmIds) {
            const swarm = swarms.getSwarmData(swarmId);
            if (!swarm) {
                continue;
            }

            const nUnits = swarm.rUnitIds().length;
            totalUnits += nUnits;
            if (swarm.blueprintVersion === props.item.rLastVersion().version) {
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
                        ui.selectUnits(
                            rGetUnitIdsByBlueprint({
                                id: props.item.id,
                                swarms,
                            }),
                        );
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

                                deck.create(name, createDefaultUnitConfig());
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
                <DeckList items={deck.rBlueprints()} onSelect={setSelectedId} />
            </Show>
        </>
    );
};
