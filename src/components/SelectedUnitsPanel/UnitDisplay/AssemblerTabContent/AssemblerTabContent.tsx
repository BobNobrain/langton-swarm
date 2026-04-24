import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { BlueprintLabel } from '@/components/BlueprintLabel/BlueprintLabel';
import { Button } from '@/components/Button/Button';
import { Heading } from '@/components/Header/Header';
import { FloatingPanelOverlay } from '@/components/FloatingPanel/FloatingPanel';
import { InventoryContent } from '@/components/Inventory/Inventory';
import { List, ListEmptyContent, ListItem } from '@/components/List/List';
import { TimeLabel } from '@/components/TimeLabel/TimeLabel';
import type { BlueprintId, UnitId } from '@/game';
import { getConstructionCosts, getConstructionTime } from '@/game/config';
import { useGame } from '@/gameContext';
import { createInventoryTracker, createAssemblerTracker } from '@/hooks/trackers';
import styles from './AssemblerTabContent.module.css';
import { AssemblerMenu } from '@/components/AssemblerMenu/AssemblerMenu';
import { KeyCode } from '@/lib/input';

export const AssemblerTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const { deck, units } = useGame();
    const { rCurrentSpawn, rSpawnQueue, rSpawnProgress } = createAssemblerTracker(() => props.unitId);
    const spawnQueue = createMemo(() => {
        return rSpawnQueue().map((item) => {
            return {
                ...item,
                costs: getConstructionCosts(item.config),
                time: getConstructionTime(item.config),
            };
        });
    });

    const unitInventory = createInventoryTracker(() => props.unitId);
    const isCurrentSpawnBlocked = createMemo(() => rCurrentSpawn()?.started === null);

    const bpName = (bpId: BlueprintId): string => {
        const bp = deck.getBlueprint(bpId);
        if (!bp) {
            return '??';
        }

        return bp.rName();
    };

    const [isPickerVisible, setPickerVisible] = createSignal(false);

    return (
        <>
            <FloatingPanelOverlay dark visible={isPickerVisible()}>
                <AssemblerMenu
                    unitId={props.unitId}
                    enabled={isPickerVisible()}
                    unitInventory={unitInventory()}
                    onClose={() => setPickerVisible(false)}
                    onQueue={(bpId, amount) => {
                        const bp = deck.getBlueprint(bpId);
                        const unitId = props.unitId;
                        if (!bp || unitId === null) {
                            return;
                        }
                        const version = bp.rLastVersion();

                        for (let i = 0; i < amount; i++) {
                            units.assembler.queue(unitId, {
                                bp: { id: bp.id, v: version.version },
                                config: version.config,
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
                            <BlueprintLabel name={bpName(rCurrentSpawn()!.bp!.id)} version={rCurrentSpawn()!.bp!.v} />
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
                <Button style="primary" hotkey={{ key: KeyCode.KeyE }} onClick={() => setPickerVisible(true)}>
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
                                            <BlueprintLabel name={bpName(queueItem.bp!.id)} version={queueItem.bp!.v} />
                                        </Show>
                                    </span>
                                </div>
                                <div class={styles.queueItemBottom}>
                                    <TimeLabel ticks={queueItem.time} />
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
