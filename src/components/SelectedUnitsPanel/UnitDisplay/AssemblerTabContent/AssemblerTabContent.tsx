import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { AssemblerMenu } from '@/components/AssemblerMenu/AssemblerMenu';
import { BlueprintLabel } from '@/components/BlueprintLabel/BlueprintLabel';
import { Button } from '@/components/Button/Button';
import { FloatingPanelOverlay } from '@/components/FloatingPanel/FloatingPanel';
import { InventoryContent } from '@/components/Inventory/Inventory';
import { List, ListEmptyContent, ListItem } from '@/components/List/List';
import { TimeLabel } from '@/components/TimeLabel/TimeLabel';
import type { BlueprintId, UnitId } from '@/game';
import { getConstructionCosts, getConstructionPoints } from '@/game/config';
import { useGame } from '@/gameContext';
import { createInventoryTracker, createAssemblerTracker, createIsStaticTracker } from '@/hooks/trackers';
import { KeyCode } from '@/lib/input';
import styles from './AssemblerTabContent.module.css';

export const AssemblerTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const { playerDeck, units } = useGame();
    const { rCurrentSpawn, rSpawnQueue, rSpawnProgress, rCharacteristics } = createAssemblerTracker(() => props.unitId);
    const { rIsStatic } = createIsStaticTracker(() => props.unitId);

    const spawnQueue = createMemo(() => {
        const { speed } = rCharacteristics();
        return rSpawnQueue().map((item) => {
            return {
                ...item,
                costs: getConstructionCosts(item.config),
                time: getConstructionPoints(item.config) / speed,
            };
        });
    });

    const unitInventory = createInventoryTracker(() => props.unitId);
    const isCurrentSpawnBlocked = createMemo(() => rCurrentSpawn()?.resourcesConsumed === false);

    const [isPickerVisible, setPickerVisible] = createSignal(false);

    const getBpName = (bp: { id: BlueprintId; v: number }): string => {
        const controller = playerDeck.getBlueprint(bp.id)!;
        return controller.rName();
    };

    return (
        <>
            <FloatingPanelOverlay dark visible={isPickerVisible()}>
                <AssemblerMenu
                    unitId={props.unitId}
                    enabled={isPickerVisible()}
                    unitInventory={unitInventory()}
                    speed={rCharacteristics().speed}
                    onClose={() => setPickerVisible(false)}
                    onQueue={(bpId, amount) => {
                        const bp = playerDeck.getBlueprint(bpId);
                        const unitId = props.unitId;
                        if (!bp || unitId === null) {
                            return;
                        }

                        for (let i = 0; i < amount; i++) {
                            units.assembler.queueBlueprint(unitId, {
                                blueprint: bp.id,
                            });
                        }
                    }}
                />
            </FloatingPanelOverlay>
            <div class={styles.currentSpawn}>
                <Show when={rCurrentSpawn()} fallback={<div>Nothing is being constructed</div>}>
                    <div>
                        <span class={styles.assemblingLabel}>Assembling:</span>
                        <Show when={rCurrentSpawn()!.bp} fallback="(unknown blueprint)">
                            <BlueprintLabel name={getBpName(rCurrentSpawn()!.bp!)} version={rCurrentSpawn()!.bp!.v} />
                        </Show>
                        <span class={styles.progressLabel}>{(rSpawnProgress() * 100).toFixed()}%</span>
                    </div>
                    <div class={styles.currentSpawnCosts}>
                        <span>Construction cost:</span>
                        <Show
                            when={isCurrentSpawnBlocked()}
                            fallback={<InventoryContent contents={rCurrentSpawn()!.costs} concise />}
                        >
                            <InventoryContent
                                contents={unitInventory().contents}
                                costs={rCurrentSpawn()!.costs}
                                concise
                            />
                        </Show>
                    </div>
                </Show>
                <div
                    class={styles.progressBar}
                    style={{
                        width: (rSpawnProgress() * 100).toFixed(1) + '%',
                    }}
                ></div>
            </div>
            <div class={styles.actions}>
                <Button
                    style="primary"
                    hotkey={{ key: KeyCode.KeyE }}
                    disabled={!rIsStatic()}
                    onClick={() => setPickerVisible(true)}
                >
                    Assemble unit...
                </Button>
            </div>
            <List insetH>
                <For each={spawnQueue()} fallback={<ListEmptyContent>Spawn queue is empty</ListEmptyContent>}>
                    {(queueItem, index) => {
                        return (
                            <ListItem>
                                <div class={styles.queueItemTop}>
                                    <span class={styles.queueIndexLabel}>#{index() + 1}</span>
                                    <span style="flex: 1 1 auto">
                                        <Show when={queueItem.bp} fallback="(unknown blueprint)">
                                            <BlueprintLabel name={getBpName(queueItem.bp!)} version={queueItem.bp!.v} />
                                        </Show>
                                    </span>
                                </div>
                                <div class={styles.queueItemBottom}>
                                    <TimeLabel title="Expected construction time" ticks={queueItem.time} />
                                    <InventoryContent
                                        costs={queueItem.costs}
                                        contents={unitInventory().contents}
                                        concise
                                    />
                                </div>
                            </ListItem>
                        );
                    }}
                </For>
            </List>
        </>
    );
};
