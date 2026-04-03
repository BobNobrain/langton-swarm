import { createMemo, For, Show, type Component } from 'solid-js';
import { BlueprintLabel } from '@/components/BlueprintLabel/BlueprintLabel';
import { InventoryContent } from '@/components/Inventory/Inventory';
import { List, ListEmptyContent, ListItem } from '@/components/List/List';
import type { UnitId } from '@/game';
import { getConstructionCosts, getConstructionTime } from '@/game/construction';
import { useGame } from '@/gameContext';
import { createInventoryTracker, createMotherTracker } from '@/hooks/trackers';
import styles from './MotherTabContent.module.css';
import { Symbols } from '@/lib/ascii';
import { TimeLabel } from '@/components/TimeLabel/TimeLabel';

export const MotherTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const { gameTick } = useGame();
    const { rCurrentSpawn, rSpawnQueue, rSpawnProgress } = createMotherTracker(() => props.unitId);
    const spawnQueue = createMemo(() => {
        return rSpawnQueue().map((item) => {
            return {
                ...item,
                costs: getConstructionCosts(item.version.config),
                time: getConstructionTime(item.version.config),
            };
        });
    });

    const motherInventory = createInventoryTracker(() => props.unitId);
    const isCurrentSpawnBlocked = createMemo(() => rCurrentSpawn()?.started === null);

    return (
        <>
            <div class={styles.currentSpawn}>
                <Show when={rCurrentSpawn()} fallback={<div>Nothing is being constructed</div>}>
                    <div>
                        <span class={styles.assemblingLabel}>Assembling:</span>
                        <BlueprintLabel name={rCurrentSpawn()!.bp.rName()} version={rCurrentSpawn()!.version.version} />
                        <span class={styles.progressLabel}>{(rSpawnProgress() * 100).toFixed()}%</span>
                    </div>
                    <div class={styles.currentSpawnCosts}>
                        <span>Construction cost:</span>
                        <Show
                            when={isCurrentSpawnBlocked()}
                            fallback={<InventoryContent contents={rCurrentSpawn()!.costs} concise />}
                        >
                            <InventoryContent
                                contents={motherInventory().contents}
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
            <List insetH>
                <For each={spawnQueue()} fallback={<ListEmptyContent>Spawn queue is empty</ListEmptyContent>}>
                    {(queueItem, index) => {
                        return (
                            <ListItem>
                                <div class={styles.queueItem}>
                                    <span class={styles.queueIndexLabel}>#{index() + 1}</span>
                                    <span style="flex: 1 1 auto">
                                        <BlueprintLabel
                                            name={queueItem.bp.rName()}
                                            version={queueItem.version.version}
                                        />
                                    </span>
                                    <InventoryContent
                                        costs={queueItem.costs}
                                        contents={motherInventory().contents}
                                        concise
                                    />
                                    <TimeLabel ticks={queueItem.time} />
                                </div>
                            </ListItem>
                        );
                    }}
                </For>
            </List>
        </>
    );
};
