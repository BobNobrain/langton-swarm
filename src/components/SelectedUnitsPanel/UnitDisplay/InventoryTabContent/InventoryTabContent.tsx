import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import { Inventory } from '@/components/Inventory/Inventory';
import { UnitList } from '@/components/UnitList/UnitList';
import type { UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { createInventoryTracker, createUnitsAtLocationTracker, createUnitTracker } from '@/hooks/trackers';
import { triggerResize } from '@/lib/BoundsTracker';
import { KeyCode } from '@/lib/input';
import styles from './InventoryTabContent.module.css';

export const InventoryTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const { units } = useGame();
    const inventory = createInventoryTracker(() => props.unitId);
    const { rLocation } = createUnitTracker(() => props.unitId);
    const localUnitsIds = createUnitsAtLocationTracker(rLocation);

    const transferTargets = createMemo(() => {
        const locals = localUnitsIds();
        const targets: UnitId[] = [];

        for (const unitId of locals) {
            if (unitId === props.unitId) {
                continue;
            }
            if (units.inventory.getInfo(unitId) === null) {
                continue;
            }

            targets.push(unitId);
        }

        return targets;
    });

    const [isTransferMode, setIsTransferMode] = createSignal(false);
    const [selectedTransferTarget, setSelectedTransferTarget] = createSignal<UnitId | null>(null);

    const transferTarget = createMemo(() => {
        const manuallySelected = selectedTransferTarget();
        const allTargets = transferTargets();

        if (manuallySelected && allTargets.includes(manuallySelected)) {
            return manuallySelected;
        }

        if (allTargets.length === 1) {
            return allTargets[0];
        }

        return null;
    });

    const transferTargetInventory = createInventoryTracker(transferTarget);

    return (
        <div
            class={styles.wrapper}
            classList={{
                [styles.doubleSectioned]: isTransferMode(),
            }}
        >
            <Inventory
                data={inventory()}
                dragInfo={isTransferMode() && props.unitId ? { source: props.unitId } : undefined}
                fullHeight
                headerAction={
                    <Button
                        style="text"
                        hotkey={{ key: KeyCode.KeyE }}
                        onClick={() => {
                            setIsTransferMode((value) => {
                                if (value) {
                                    // switching off
                                    setSelectedTransferTarget(null);
                                }
                                return !value;
                            });
                            triggerResize();
                        }}
                    >
                        {isTransferMode() ? 'Cancel' : 'Transfer...'}
                    </Button>
                }
            />
            <Show when={isTransferMode()}>
                <div class={styles.targetsList}>
                    <Show
                        when={transferTarget()}
                        fallback={
                            <UnitList
                                unitIds={transferTargets()}
                                onItemClick={({ id }) => setSelectedTransferTarget(id)}
                                empty="No units nearby"
                            />
                        }
                    >
                        <Inventory
                            data={transferTargetInventory()}
                            dragInfo={{ source: transferTarget()! }}
                            fullHeight
                            headerAction={
                                <Button
                                    style="text"
                                    hotkey={{ key: KeyCode.Esc }}
                                    disabled={transferTargets().length <= 1}
                                    onClick={() => {
                                        setSelectedTransferTarget(null);
                                    }}
                                >
                                    Switch...
                                </Button>
                            }
                        />
                    </Show>
                </div>
            </Show>
        </div>
    );
};
