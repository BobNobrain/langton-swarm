import { createEffect, createMemo, createSignal, Show, type Component } from 'solid-js';
import type { BlueprintController } from '@/game';
import { createDefaultUnitConfig } from '@/game/presets';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { Select, type SelectOption } from '../Select/Select';
import styles from './DeckBrowser.module.css';
import { TextInput } from '../TextInput/TextInput';
import { KeyCode } from '@/lib/input';

export const DeckHeader: Component<{
    bp: BlueprintController | null;
    hasChanges: boolean;
    canSave: boolean;
    onReset: () => void;
    onSave: () => void;
}> = (props) => {
    const { deck, ui } = useGame();

    const title = () => {
        if (props.canSave) {
            return props.hasChanges ? 'Editing*' : 'Editing';
        }
        return 'Viewing';
    };

    const versionOptions = createMemo((): SelectOption<number>[] => {
        const bp = props.bp;
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
        const selected = ui.rDeckSelectedVersion() ?? props.bp?.rLastVersion().version;
        return versionOptions().find((option) => option.value === selected) ?? null;
    });

    const [newName, setNewName] = createSignal('');
    createEffect(() => {
        const bp = props.bp;
        if (bp === null) {
            return;
        }

        setNewName(bp.rName());
    });

    return (
        <FloatingPanelHeader>
            <div class={styles.header}>
                <Header size="sm">
                    <Show when={ui.rDeckSelectedBlueprint() !== null} fallback="Blueprints">
                        {title()}
                    </Show>
                </Header>
                <Show when={props.bp !== null}>
                    <Button style="text">Archive</Button>
                    <Button onClick={props.onReset}>Reset</Button>
                    <Show when={props.hasChanges} fallback={<Button onClick={ui.deckUnselectBlueprint}>Close</Button>}>
                        <Button style="primary" disabled={!props.canSave} onClick={props.onSave}>
                            Save
                        </Button>
                    </Show>
                </Show>
            </div>
            <div class={styles.toolbar}>
                <Show
                    when={ui.rDeckSelectedBlueprint() === null}
                    fallback={
                        <>
                            <TextInput
                                value={newName()}
                                onUpdate={setNewName}
                                placeholder="My_Blueprint"
                                dark
                                onKeyDown={(ev) => {
                                    if (ev.code !== KeyCode.Enter || !props.bp) {
                                        return;
                                    }

                                    ev.preventDefault();
                                    deck.rename(props.bp.id, newName());
                                    (ev.target as HTMLInputElement).blur();
                                }}
                            />
                            <Select
                                value={selectedVersionOption()}
                                options={versionOptions()}
                                onUpdate={(option) => {
                                    ui.deckSelectVersion(option.value);
                                }}
                                dark
                                popupOpening="manual"
                            />
                        </>
                    }
                >
                    <Button>Import...</Button>
                    <Button
                        style="primary"
                        onClick={() => {
                            const names = new Set(deck.rBlueprints().map((bp) => bp.rName()));
                            let name = 'New_Blueprint';
                            let i = 1;
                            while (names.has(name)) {
                                name = 'New_Blueprint_' + i;
                                i++;
                            }
                            deck.create(name, createDefaultUnitConfig());
                        }}
                    >
                        Create
                    </Button>
                </Show>
            </div>
        </FloatingPanelHeader>
    );
};
