import { createMemo, For, Show, type Component } from 'solid-js';
import styles from './SelectedUnitsList.module.css';
import { useGame } from '@/gameContext';
import { getUnitBlueprint, rGetUnitIdsByBlueprint } from '@/game/utils';
import type { BlueprintId, SwarmUnitId } from '@/game';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { Button } from '../Button/Button';
import { Symbols } from '@/lib/ascii';

type UnitData = {
    id: SwarmUnitId;
    blueprintId: BlueprintId;
    blueprintName: () => string;
    blueprintVersion: number;
};

export const SelectedUnitsList: Component<{
    hoveredCommandTargets: Set<SwarmUnitId> | null;
}> = (props) => {
    const { ui, swarms, deck } = useGame();

    const selectedUnits = createMemo(() => {
        const ids = ui.rSelectedUnits();
        const result: UnitData[] = [];

        for (const unitId of ids) {
            const unitBlueprint = getUnitBlueprint({ unitId, swarms, deck });
            if (!unitBlueprint) {
                continue;
            }

            result.push({
                id: unitId,
                blueprintId: unitBlueprint.blueprint.id,
                blueprintName: unitBlueprint.blueprint.rName,
                blueprintVersion: unitBlueprint.version,
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
                                    ui.selectUnits(rGetUnitIdsByBlueprint({ id: unitData.blueprintId, swarms }));
                                }}
                            >
                                {unitData.blueprintName()}
                            </span>{' '}
                            <span
                                class={styles.unitBlueprintVersion}
                                role="button"
                                onClick={() => {
                                    ui.selectUnits(
                                        rGetUnitIdsByBlueprint({
                                            id: unitData.blueprintId,
                                            version: unitData.blueprintVersion,
                                            swarms,
                                        }),
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
