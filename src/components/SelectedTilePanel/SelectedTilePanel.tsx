import { createEffect, createMemo, createSignal, onMount, Show, type Component } from 'solid-js';
import { ResourceDeposit } from '@/game';
import { useGame } from '@/gameContext';
import { createEventListener } from '@/hooks/events';
import { DefList, DefListItem } from '../DefList/DefList';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { WorldInfo } from '../WorldInfo/WorldInfo';

export const SelectedTilePanel: Component = () => {
    const { ui, world } = useGame();

    const [getDeposit, setDeposit] = createSignal<ResourceDeposit | null>(null);
    createEffect(() => {
        const selectedTile = ui.rSelectedTile();
        setDeposit((selectedTile && world.resources.get(selectedTile)) || null);
    });

    onMount(() =>
        createEventListener(world.resourceUpdate, (at, deposit) => {
            if (at !== ui.rSelectedTile()) {
                return;
            }

            setDeposit({ ...deposit });
        }),
    );

    const tileInfo = createMemo(() => {
        const selectedTile = ui.rSelectedTile();
        if (selectedTile === null) {
            return null;
        }

        return {
            id: selectedTile.toString(16).padStart(3, '0'),
            resources: getDeposit(),
        };
    });

    return (
        <FloatingPanel pinLeft pinTop withMargin padded>
            <FloatingPanelHeader>
                <Header size="sm">
                    <Show when={tileInfo()} fallback="World">
                        Tile
                    </Show>
                </Header>
            </FloatingPanelHeader>
            <Show when={tileInfo()} fallback={<WorldInfo />}>
                <DefList>
                    <DefListItem name="ID">{tileInfo()!.id}</DefListItem>

                    <DefListItem name="Resources">
                        <Show when={tileInfo()!.resources}>
                            {tileInfo()!.resources!.resource} ({tileInfo()!.resources!.amount.toString()})
                        </Show>
                    </DefListItem>
                </DefList>
            </Show>
        </FloatingPanel>
    );
};
