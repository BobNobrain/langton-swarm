import { createMemo, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header } from '../Header/Header';
import { WorldInfo } from '../WorldInfo/WorldInfo';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';

export const SelectedTilePanel: Component = () => {
    const { ui, world } = useGame();

    const tileInfo = createMemo(() => {
        const selectedTile = ui.rSelectedTile();
        if (selectedTile === null) {
            return null;
        }

        const deposit = world.planet()!.resources.get(selectedTile);

        return {
            id: selectedTile.toString(16).padStart(3, '0'),
            resources: deposit,
        };
    });

    return (
        <FloatingPanel pinLeft pinTop withMargin>
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
