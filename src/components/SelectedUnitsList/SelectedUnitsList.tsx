import { createMemo, For, Show, type Component } from 'solid-js';
import type { BlueprintId, UnitId } from '@/game';
import { isPile, isStationary } from '@/game/config';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { BlueprintLabel } from '../BlueprintLabel/BlueprintLabel';
import { Button } from '../Button/Button';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './SelectedUnitsList.module.css';

type OwnUnitData = {
    own: true;
    id: UnitId;
    blueprintId: BlueprintId;
    blueprintName: () => string;
    blueprintVersion: number;
    icon: string;
};

type OtherUnitData = {
    own: false;
    id: UnitId;
    text: string;
    icon: string;
};

type UnitData = OwnUnitData | OtherUnitData;

export const SelectedUnitsList: Component<{
    hoveredCommandTargets: Set<UnitId> | null;
}> = (props) => {
    const { ui, deck, units } = useGame();

    const selectedUnits = createMemo(() => {
        const ids = ui.rSelectedUnits();
        const result: UnitData[] = [];

        for (const unitId of ids) {
            const found = deck.findByUnitId(unitId);
            if (!found) {
                const config = units.getConfig(unitId);
                let icon = Symbols.DottedCircle;
                let text = '(unknown unit)';

                if (config) {
                    const pile = isPile(config);

                    if (pile) {
                        text = '(pile of material)';
                        icon = Symbols.Circle;
                    } else {
                        const stat = isStationary(config);
                        icon = stat ? Symbols.SquareOutlined : Symbols.DiamondOutlined;
                    }
                }

                result.push({
                    own: false,
                    id: unitId,
                    text,
                    icon,
                });
                continue;
            }

            result.push({
                own: true,
                id: unitId,
                blueprintId: found.bp.id,
                blueprintName: found.bp.rName,
                blueprintVersion: found.v,
                icon: isStationary(found.bp.rVersions()[found.v].config)
                    ? Symbols.SquareOutlined
                    : Symbols.DiamondOutlined,
            });
        }
        return result;
    });

    return (
        <List insetH>
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
                            {unitData.icon}{' '}
                            <Show when={unitData.own} fallback={(unitData as OtherUnitData).text}>
                                <BlueprintLabel
                                    name={(unitData as OwnUnitData).blueprintName()}
                                    version={(unitData as OwnUnitData).blueprintVersion}
                                    onNameClick={() => {
                                        ui.selectUnits(
                                            deck.getBlueprint((unitData as OwnUnitData).blueprintId)!.rUnitIdsFlat(),
                                        );
                                    }}
                                    onVersionClick={() => {
                                        ui.selectUnits(
                                            deck.getBlueprint((unitData as OwnUnitData).blueprintId)!.rUnitIds()[
                                                (unitData as OwnUnitData).blueprintVersion
                                            ] ?? [],
                                        );
                                    }}
                                />
                            </Show>
                        </ListItem>
                    );
                }}
            </For>
        </List>
    );
};
