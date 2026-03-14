import { createMemo, For, Show, type Component } from 'solid-js';
import type { SwarmBotId, UnitCommandArg } from '@/game';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './SelectedUnitsPanel.module.css';

type UnitData = {
    id: SwarmBotId;
    blueprintName: string;
    blueprintVersion: number;
};

type CommandData = {
    name: string;
    appliesTo: Set<SwarmBotId>;
    canImmediatelyRun: boolean;
    isConfigurable: boolean;
    args: UnitCommandArg[];
};

export const SelectedUnitsPanel: Component = () => {
    const { ui, swarms, deck } = useGame();

    const selectedUnits = createMemo(() => {
        const ids = ui.rSelectedUnits();
        const result: UnitData[] = [];

        for (const unitId of ids) {
            console.log(unitId);
            const swarm = swarms.getSwarmDataByUnitId(unitId);
            console.log(swarm);
            if (!swarm) {
                continue;
            }

            const bp = deck.getBlueprint(swarm.blueprintId);
            console.log(bp);
            if (!bp) {
                continue;
            }

            result.push({
                id: unitId,
                blueprintName: bp.rName(),
                blueprintVersion: swarm?.blueprintVersion ?? 0,
            });
        }
        return result;
    });

    const availableCommands = createMemo(() => {
        const ids = ui.rSelectedUnits();
        const commands: Record<string, CommandData> = {};

        for (const unitId of ids) {
            const swarm = swarms.getSwarmDataByUnitId(unitId);
            if (!swarm) {
                continue;
            }

            const bpId = `${swarm.blueprintId}v${swarm.blueprintVersion}`;
            const unitCommands = swarms.getUnitCommands(unitId);
            for (const cmd of unitCommands) {
                const cmdId = `${cmd.name}:${bpId}`;

                if (commands[cmdId]) {
                    commands[cmdId].appliesTo.add(unitId);
                    continue;
                }

                commands[cmdId] = {
                    name: cmd.name,
                    args: cmd.args,
                    appliesTo: new Set([unitId]),
                    canImmediatelyRun: cmd.args.every((arg) => arg.defaultValue !== null),
                    isConfigurable: cmd.args.length > 0,
                };
            }
        }

        return Object.values(commands);
    });

    return (
        <FloatingPanel pinBottom pinLeft withMargin>
            <FloatingPanelHeader>
                <Header size="sm">Units ({ui.rSelectedUnits().length})</Header>
                <div class={styles.commandPanel}>
                    <For each={availableCommands()} fallback="No commands available">
                        {(commandData) => {
                            return (
                                <>
                                    <Button style={commandData.canImmediatelyRun ? 'primary' : 'secondary'}>
                                        {commandData.name}
                                    </Button>
                                    <Show when={commandData.isConfigurable && commandData.canImmediatelyRun}>
                                        <Button style="secondary">CFG</Button>
                                    </Show>
                                </>
                            );
                        }}
                    </For>
                </div>
            </FloatingPanelHeader>
            <List insetH>
                <For each={selectedUnits()} fallback={<ListEmptyContent>Nothing is selected</ListEmptyContent>}>
                    {(unitData) => {
                        return (
                            <ListItem
                                right={
                                    <Button style="text" onClick={() => ui.removeSelectedUnit(unitData.id)}>
                                        -
                                    </Button>
                                }
                                onMainClick={() => {
                                    ui.selectUnits([unitData.id]);
                                }}
                            >
                                {unitData.blueprintName} v{unitData.blueprintVersion.toString()}
                            </ListItem>
                        );
                    }}
                </For>
            </List>
        </FloatingPanel>
    );
};
