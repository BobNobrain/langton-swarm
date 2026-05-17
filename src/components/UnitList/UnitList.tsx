import { createMemo, For, Show, type Component, type JSX } from 'solid-js';
import type { BlueprintId, UnitConfiguration, UnitId } from '@/game';
import { isConstructionSite, isPile, isStationary } from '@/game/config';
import { NO_FACTION, type FactionId } from '@/game/factions';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { BlueprintLabel } from '../BlueprintLabel/BlueprintLabel';
import { Button } from '../Button/Button';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './UnitList.module.css';

type UnitItemData = {
    id: UnitId;
    blueprint: {
        id: BlueprintId;
        name: () => string;
        version: number;
    } | null;
    config: UnitConfiguration | null;
    faction: FactionId;
};

const UnitListItem: Component<{
    data: UnitItemData;
    ownFaction: FactionId;
    onBlueprintNameClick?: (id: BlueprintId) => void;
    onBlueprintVersionClick?: (id: BlueprintId, version: number) => void;
}> = (props) => {
    return (
        <>
            <span
                class={styles.unitIcon}
                classList={{
                    [styles.ownUnit]: props.ownFaction === props.data.faction,
                    [styles.neutralUnit]: props.data.faction === NO_FACTION,
                }}
            >
                {getUnitIcon(props.data.config)}
            </span>
            <Show
                when={props.data.blueprint}
                fallback={<span class={styles.unitLabel}>{getUnitText(props.data.config)}</span>}
            >
                <BlueprintLabel
                    name={props.data.blueprint!.name()}
                    version={props.data.blueprint!.version}
                    onNameClick={
                        props.onBlueprintNameClick
                            ? () => props.onBlueprintNameClick!(props.data.blueprint!.id)
                            : undefined
                    }
                    onVersionClick={
                        props.onBlueprintVersionClick
                            ? () =>
                                  props.onBlueprintVersionClick!(
                                      props.data.blueprint!.id,
                                      props.data.blueprint!.version,
                                  )
                            : undefined
                    }
                />
            </Show>
        </>
    );
};

export const UnitList: Component<{
    unitIds: UnitId[];
    hoveredCommandTargets?: Set<UnitId> | null;
    onItemClick?: (data: UnitItemData) => void;
    onUnitBlueprintClick?: (bpId: BlueprintId) => void;
    onUnitBlueprintVersionClick?: (bpId: BlueprintId, version: number) => void;
    unitActions?: (unitData: UnitItemData) => JSX.Element;
    hideUnitActions?: boolean;
    empty?: JSX.Element;
}> = (props) => {
    const { playerDeck, units } = useGame();

    const selectedUnits = createMemo(() => {
        const ids = props.unitIds;
        const result: UnitItemData[] = [];

        for (const unitId of ids) {
            const faction = units.factions.getFaction(unitId);

            const found = playerDeck.findByUnitId(unitId);
            const config = units.getConfig(unitId);

            result.push({
                id: unitId,
                faction,
                config,
                blueprint: found
                    ? {
                          id: found.bp.id,
                          name: found.bp.rName,
                          version: found.v,
                      }
                    : null,
            });
        }
        return result;
    });

    return (
        <List insetH>
            <For each={selectedUnits()} fallback={<ListEmptyContent>{props.empty ?? 'No units'}</ListEmptyContent>}>
                {(unitData) => {
                    return (
                        <ListItem
                            class={(props.hoveredCommandTargets?.has(unitData.id) ?? true) ? '' : styles.nonTargetUnit}
                            right={
                                <Show when={props.unitActions && !props.hideUnitActions}>
                                    <div class={styles.unitActions}>{props.unitActions!(unitData)}</div>
                                </Show>
                            }
                            onClick={props.onItemClick ? () => props.onItemClick!(unitData) : undefined}
                        >
                            <UnitListItem
                                data={unitData}
                                ownFaction={playerDeck.owner}
                                onBlueprintNameClick={props.onUnitBlueprintClick}
                                onBlueprintVersionClick={props.onUnitBlueprintVersionClick}
                            />
                        </ListItem>
                    );
                }}
            </For>
        </List>
    );
};

function getUnitIcon(config: UnitConfiguration | null): string {
    if (!config) {
        return Symbols.DottedCircle;
    }

    if (isPile(config)) {
        return Symbols.Circle;
    }

    if (isConstructionSite(config)) {
        return Symbols.SquareGrid;
    }

    return isStationary(config) ? Symbols.SquareOutlined : Symbols.DiamondOutlined;
}

function getUnitText(config: UnitConfiguration | null): string {
    if (config) {
        if (isPile(config)) {
            return '(pile of material)';
        }

        if (isConstructionSite(config)) {
            // TODO: construction site blueprint reference
            return 'Construction site';
        }
    }

    return '(unknown unit)';
}
