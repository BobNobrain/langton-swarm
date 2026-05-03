import { createEffect, createMemo, createSignal, For, onMount, Show, type Component } from 'solid-js';
import { ResourceDeposit, ResourceTier } from '@/game';
import { Inventory } from '@/game/inventory';
import type { MarkerData } from '@/game/systems';
import { useGame } from '@/gameContext';
import { createEventListener } from '@/hooks/events';
import { Badge } from '../Badge/Badge';
import { DefList, DefListItem } from '../DefList/DefList';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Heading } from '../Header/Header';
import { InventoryContent } from '../Inventory/Inventory';
import { WorldInfo } from '../WorldInfo/WorldInfo';
import { Symbols } from '@/lib/ascii';

const MARKER_ICONS_BY_TYPE: Record<string, string> = {
    resource: Symbols.DiamondOutlined,
};

export const SelectedTilePanel: Component = () => {
    const { ui, world, units, factions } = useGame();

    const [getDeposits, setDeposits] = createSignal<ResourceDeposit[]>([]);
    createEffect(() => {
        const selectedTile = ui.rSelectedTile();
        setDeposits((selectedTile && world.resources.findDeposits({ location: selectedTile })) || []);
    });

    const [getMarkers, setMarkers] = createSignal<MarkerData[]>([]);
    createEffect(() => {
        const selectedTile = ui.rSelectedTile();
        if (!selectedTile) {
            setMarkers([]);
            return;
        }

        const map = units.markers.getMap(factions.player.id);
        const markersByType = map.getAllAt(selectedTile);
        setMarkers(Object.values(markersByType));
    });

    onMount(() => {
        createEventListener(world.resources.updated, (at) => {
            if (at !== ui.rSelectedTile()) {
                return;
            }

            setDeposits(world.resources.findDeposits({ location: at }));
        });

        createEventListener(units.markers.updated, (map, affectedTiles) => {
            const selectedTile = ui.rSelectedTile();
            if (!selectedTile || !affectedTiles.has(selectedTile)) {
                return;
            }

            const markersByType = map.getAllAt(selectedTile);
            setMarkers(Object.values(markersByType));
        });
    });

    const tileInfo = createMemo(() => {
        const selectedTile = ui.rSelectedTile();
        if (selectedTile === null) {
            return null;
        }

        const surfaceDeposits = Inventory.empty();
        const deepDeposits = Inventory.empty();

        for (const deposit of getDeposits()) {
            switch (deposit.tier) {
                case ResourceTier.Tier1:
                    surfaceDeposits.alter(deposit.resource, deposit.amount);
                    break;

                case ResourceTier.Tier2:
                    deepDeposits.alter(deposit.resource, deposit.amount);
                    break;
            }
        }

        return {
            id: selectedTile.toString(16).padStart(3, '0'),
            surfaceDeposits,
            deepDeposits,
        };
    });

    return (
        <FloatingPanel pinLeft pinTop withMargin padded>
            <FloatingPanelHeader>
                <Heading size="sm">
                    <Show when={tileInfo()} fallback="World">
                        Tile
                    </Show>
                </Heading>
            </FloatingPanelHeader>
            <Show when={tileInfo()} fallback={<WorldInfo />}>
                <DefList>
                    <DefListItem name="ID">{tileInfo()!.id}</DefListItem>

                    <DefListItem name="Surface">
                        <InventoryContent contents={tileInfo()!.surfaceDeposits.content} concise empty="--" />
                    </DefListItem>
                    <DefListItem name="Depths">
                        <InventoryContent contents={tileInfo()!.deepDeposits.content} concise empty="--" />
                    </DefListItem>

                    <DefListItem name="Markers">
                        <For each={getMarkers()}>
                            {(marker) => {
                                return (
                                    <Badge icon={MARKER_ICONS_BY_TYPE[marker.type] ?? Symbols.Circle}>
                                        {marker.type}
                                    </Badge>
                                );
                            }}
                        </For>
                    </DefListItem>
                </DefList>
            </Show>
        </FloatingPanel>
    );
};
