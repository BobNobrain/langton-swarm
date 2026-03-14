import { createMemo, Show, type Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header } from '../Header/Header';
import { WorldInfo } from '../WorldInfo/WorldInfo';
import { FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';

export const SelectionPanelContent: Component = () => {
    const { ui } = useGame();

    const tileInfo = createMemo(() => {
        const selectedTile = ui.rSelectedTile();
        if (selectedTile === null) {
            return null;
        }

        return {
            id: selectedTile.toString(16).padStart(3, '0'),
            resources: [],
        };
    });

    return (
        <>
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
                    <DefListItem name="Resources">{tileInfo()!.resources.length ? '??' : '--'}</DefListItem>
                </DefList>
            </Show>
        </>
    );
};
