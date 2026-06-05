import { createResource, createSignal, For, Show, type Component } from 'solid-js';
import { useAppState } from '@/appContext';
import { setGameOptions } from '@/gameOptions';
import { Symbols } from '@/lib/ascii';
import { KeyCode } from '@/lib/input';
import { deleteSave, loadSaveList, retrieveSaveData, type GameSaveMetadata } from '@/lib/saves';
import { formatInteger } from '@/lib/strings';
import { isCurrent, renderGameVersion } from '@/lib/version';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './SaveManager.module.css';
import { ConfirmationButton } from '../ConfirmationButton/ConfirmationButton';

export const SaveManager: Component = () => {
    const [saveList, { refetch }] = createResource(() => loadSaveList());
    const { setScene } = useAppState();
    const [isLoading, setLoading] = createSignal(false);

    const load = async (saveEntry: GameSaveMetadata) => {
        setLoading(true);
        const saveData = await retrieveSaveData(saveEntry.id);
        if (!saveData) {
            setLoading(false);
            console.error('Could not find the save o_O');
            return;
        }

        setGameOptions({ save: saveData });
        setScene('game');
    };

    const del = async (saveEntry: GameSaveMetadata) => {
        setLoading(true);
        try {
            await deleteSave(saveEntry);
            await refetch();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class={styles.manager}>
            <Show when={saveList.error}>
                <div class={styles.error}>
                    Could not retreive save list: {saveList.error?.toString() ?? 'Unknown error'}
                </div>
            </Show>
            <Show when={saveList.loading}>
                <div class={styles.loader}>Loading...</div>
            </Show>
            <Show when={saveList()}>
                <List insetH>
                    <For
                        each={saveList()!}
                        fallback={<ListEmptyContent centered>No saves found in this browser</ListEmptyContent>}
                    >
                        {(saveEntry, index) => {
                            return (
                                <ListItem
                                    right={
                                        <div class={styles.saveActions}>
                                            <Button
                                                hotkey={index() === 0 ? { key: KeyCode.KeyE } : undefined}
                                                disabled={isLoading()}
                                                onClick={() => {
                                                    load(saveEntry);
                                                }}
                                            >
                                                Load
                                            </Button>
                                            <ConfirmationButton
                                                style="secondary-danger"
                                                confirmation="Delete this save? This cannot be undone"
                                                disabled={isLoading()}
                                                onClick={() => {
                                                    del(saveEntry);
                                                }}
                                            >
                                                Delete
                                            </ConfirmationButton>
                                        </div>
                                    }
                                    rightClickable
                                >
                                    <div>{saveEntry.date.toLocaleString()} / 00:00</div>
                                    <div class={styles.badges}>
                                        <Badge
                                            title="Game Version"
                                            class={
                                                isCurrent(saveEntry.gameVersion)
                                                    ? styles.versionBadgeOk
                                                    : styles.versionBadgeBad
                                            }
                                        >
                                            v{renderGameVersion(saveEntry.gameVersion)}
                                        </Badge>
                                        <Badge title="World Seed" icon={Symbols.Circle} class={styles.seedBadge}>
                                            {saveEntry.worldSeed}
                                        </Badge>
                                        <Badge title="World Size" icon={Symbols.SquareGrid}>
                                            {formatInteger(saveEntry.worldSize, { digits: 0 })}
                                        </Badge>
                                    </div>
                                </ListItem>
                            );
                        }}
                    </For>
                </List>
            </Show>
        </div>
    );
};
