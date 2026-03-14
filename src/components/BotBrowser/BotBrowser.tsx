import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { SwarmBotId, type NodeId, type SwarmId } from '@/game';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { Breadcrumbs, type Breadcrumb } from '../Breadcrumbs/Breadcrumbs';
import { FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { List, ListItem } from '../List/List';
import styles from './BotBrowser.module.css';

type BlueprintData = {
    id: SwarmId;
    blueprint: {
        name: string;
        version: number;
    };
    count: number;
};

type BotListItem = {
    id: SwarmBotId;
    state: string;
    position: NodeId;
    isSelected: boolean;
};

export const BotBrowser: Component = () => {
    const { swarms, deck } = useGame();
    const [getFilters, setFilters] = createSignal<{ blueprintId?: number; blueprintVersion?: number }>({});
    const listToShow = createMemo(() => (getFilters().blueprintVersion === undefined ? 'blueprints' : 'bots'));
    const [selectedBotIds, setSelectedBotIds] = createSignal<SwarmBotId[]>([]);

    const breadcrumbs = createMemo(() => {
        const { blueprintId, blueprintVersion } = getFilters();
        const result: Breadcrumb[] = [{ text: 'All', onClick: () => setFilters({}) }];

        if (blueprintId !== undefined) {
            result.push({
                icon: Symbols.DiamondOutlined,
                text: deck.getBlueprint(blueprintId)?.rName() ?? '??',
                onClick: () => setFilters({ blueprintId }),
            });
        }
        if (blueprintVersion !== undefined) {
            result.push({
                icon: Symbols.DottedCircle,
                text: `v${blueprintVersion}`,
                onClick: () => setFilters({ blueprintId, blueprintVersion }),
            });
        }

        return result;
    });

    const blueprints = createMemo(() => {
        const result: BlueprintData[] = [];
        const filters = getFilters();

        for (const swarmId of swarms.rSwarmIds()) {
            const swarm = swarms.getSwarmData(swarmId);
            if (!swarm) {
                continue;
            }

            if (filters.blueprintId !== undefined && swarm.blueprintId !== filters.blueprintId) {
                continue;
            }
            if (filters.blueprintVersion !== undefined && swarm.blueprintVersion !== filters.blueprintVersion) {
                continue;
            }

            result.push({
                id: swarm.id,
                blueprint: {
                    name: deck.getBlueprint(swarm.blueprintId)?.rName() ?? '??',
                    version: swarm.blueprintVersion,
                },
                count: swarm.rUnitIds().length,
            });
        }
        return result;
    });

    const bots = createMemo(() => {
        const result: BotListItem[] = [];
        const filters = getFilters();

        if (filters.blueprintId === undefined || filters.blueprintVersion === undefined) {
            return result;
        }

        const swarmIds = swarms.findSwarms(filters.blueprintId, filters.blueprintVersion);
        const selectedIds = new Set(selectedBotIds());

        for (const swarmId of swarmIds) {
            const swarm = swarms.getSwarmData(swarmId);
            if (!swarm) {
                continue;
            }

            const botIds = swarm.rUnitIds();
            for (const id of botIds) {
                const data = swarm.botStates[id];
                if (!data) {
                    continue;
                }

                result.push({
                    id,
                    state: data.behaviour.state,
                    position: data.unit.location,
                    isSelected: selectedIds.has(id),
                });
            }
        }

        return result;
    });

    return (
        <>
            <FloatingPanelHeader sticky>
                <Header size="sm" withMargin>
                    Units
                </Header>
                <Breadcrumbs items={breadcrumbs()} />
            </FloatingPanelHeader>
            <List insetH>
                <Show when={listToShow() === 'blueprints'}>
                    <For each={blueprints()}>
                        {(row) => {
                            return (
                                <ListItem
                                    right={row.count.toFixed()}
                                    onClick={() =>
                                        setFilters({
                                            blueprintName: row.blueprint.name,
                                            blueprintVersion: row.blueprint.version,
                                        })
                                    }
                                >
                                    {row.blueprint.name}
                                    <span class={styles.versionNumber}>v{row.blueprint.version}</span>
                                </ListItem>
                            );
                        }}
                    </For>
                </Show>
                <Show when={listToShow() === 'bots'}>
                    <For each={bots()}>
                        {(botData) => {
                            return (
                                <ListItem
                                    checked={botData.isSelected}
                                    onCheck={(value) => {
                                        setSelectedBotIds((old) =>
                                            value ? [...old, botData.id] : old.filter((id) => id !== botData.id),
                                        );
                                    }}
                                    right={botData.position.toString(16).padStart(3, '0')}
                                    onMainClick={() => {
                                        console.log(botData);
                                    }}
                                >
                                    {botData.id} :{botData.state}
                                </ListItem>
                            );
                        }}
                    </For>
                </Show>
            </List>
        </>
    );
};
