import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import type { BotBlueprint } from '@/game';
import { BlueprintEditor } from '../BlueprintEditor/BlueprintEditor';
import { useExpandedPanel } from '../GameUI';
import styles from './DeckBrowser.module.css';

const DeckList: Component<{ items: BotBlueprint[]; selected: string | null; onSelect: (name: string) => void }> = (
    props,
) => {
    return (
        <ul class={styles.deck}>
            <For each={props.items}>
                {(blueprint) => {
                    return (
                        <li
                            class={styles.blueprint}
                            classList={{
                                [styles.selected]: blueprint.name === props.selected,
                            }}
                            onClick={() => props.onSelect(blueprint.name)}
                        >
                            <span class={styles.blueprintName}>{blueprint.name}</span>
                            <span class={styles.blueprintVersion}>v.{blueprint.version}</span>
                        </li>
                    );
                }}
            </For>
        </ul>
    );
};

export const DeckBrowser: Component = () => {
    const game = useGame();

    const blueprints = createMemo(() => {
        return Object.values(game.deck.blueprints()).map((versions) => versions[versions.length - 1]);
    });

    const [getSelectedName, setSelectedName] = createSignal<string | null>(null);
    useExpandedPanel(() => getSelectedName() !== null);

    const selectedBlueprints = createMemo(() => {
        const name = getSelectedName();
        if (!name) {
            return [];
        }

        return game.deck.blueprints()[name] ?? [];
    });

    return (
        <Show
            when={getSelectedName() === null}
            fallback={
                <BlueprintEditor
                    selected={selectedBlueprints()}
                    onSave={(program, config) => {
                        const name = getSelectedName();
                        if (!name) {
                            return;
                        }

                        game.deck.updateBlueprint(name, { program, config });
                    }}
                    onClose={() => setSelectedName(null)}
                />
            }
        >
            <DeckList items={blueprints()} selected={getSelectedName()} onSelect={setSelectedName} />
        </Show>
    );
};
