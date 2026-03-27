import { createMemo, For, Show, type Component } from 'solid-js';
import type { BlueprintId, UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { Button } from '../Button/Button';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './SelectedUnitsList.module.css';

type UnitData = {
    id: UnitId;
    blueprintId: BlueprintId;
    blueprintName: () => string;
    blueprintVersion: number;
};

export const SelectedUnitsList: Component<{
    hoveredCommandTargets: Set<UnitId> | null;
}> = (props) => {
    const { ui, deck } = useGame();

    const selectedUnits = createMemo(() => {
        const ids = ui.rSelectedUnits();
        const result: UnitData[] = [];

        for (const unitId of ids) {
            const found = deck.findByUnitId(unitId);
            if (!found) {
                continue;
            }

            result.push({
                id: unitId,
                blueprintId: found.bp.id,
                blueprintName: found.bp.rName,
                blueprintVersion: found.v,
            });
        }
        return result;
    });

    return (
        <List insetH class={styles.unitsList}>
            <For each={selectedUnits()} fallback={<ListEmptyContent>Nothing is selected</ListEmptyContent>}>
                {(unitData) => {
                    return (
                        <ListItem
                            class={(props.hoveredCommandTargets?.has(unitData.id) ?? true) ? '' : styles.nonTargetUnit}
                            right={
                                <Show when={selectedUnits().length !== 1}>
                                    <div class={styles.unitActions}>
                                        <Button style="text" onClick={() => ui.selectUnits([unitData.id])}>
                                            SEL
                                        </Button>
                                        <Button style="text" onClick={() => ui.removeSelectedUnit(unitData.id)}>
                                            RM
                                        </Button>
                                    </div>
                                </Show>
                            }
                        >
                            {Symbols.SquareOutlined}{' '}
                            <span
                                class={styles.unitBlueprintName}
                                role="button"
                                onClick={() => {
                                    ui.selectUnits(deck.getBlueprint(unitData.blueprintId)!.rUnitIdsFlat());
                                }}
                            >
                                {unitData.blueprintName()}
                            </span>{' '}
                            <span
                                class={styles.unitBlueprintVersion}
                                role="button"
                                onClick={() => {
                                    ui.selectUnits(
                                        deck.getBlueprint(unitData.blueprintId)!.rUnitIds()[
                                            unitData.blueprintVersion
                                        ] ?? [],
                                    );
                                }}
                            >
                                v.{unitData.blueprintVersion.toString()}
                            </span>
                        </ListItem>
                    );
                }}
            </For>
        </List>
    );
};
