import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import type { BlueprintId, SwarmUnitId, UnitCommandArg } from '@/game';
import { getUnitBlueprint, rGetUnitIdsByBlueprint } from '@/game/utils';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { DIGIT_KEY_CODES, type KeyCode } from '@/lib/input';
import { Button } from '../Button/Button';
import { FloatingPanel, FloatingPanelHeader } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './SelectedUnitsPanel.module.css';
import type { BsmlValue } from '@/game/program/value';

type UnitData = {
    id: SwarmUnitId;
    blueprintId: BlueprintId;
    blueprintName: string;
    blueprintVersion: number;
};

type CommandData = {
    name: string;
    args: UnitCommandArg[];
    hotkey: KeyCode | null;
    appliesTo: Set<SwarmUnitId>;
    canImmediatelyRun: boolean;
    isConfigurable: boolean;
    isPositional: boolean;
    isPartial: boolean;
};

export const SelectedUnitsPanel: Component = () => {
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
                blueprintName: unitBlueprint.blueprint.rName(),
                blueprintVersion: unitBlueprint.version,
            });
        }
        return result;
    });

    const availableCommands = createMemo(() => {
        const selectedUnitIds = ui.rSelectedUnits();
        const allCommands: Record<string, CommandData> = {};

        for (const unitId of selectedUnitIds) {
            const swarm = swarms.getSwarmDataByUnitId(unitId);
            if (!swarm) {
                continue;
            }

            const bpId = `${swarm.blueprintId}v${swarm.blueprintVersion}`;
            const unitCommands = swarms.getUnitCommands(unitId);
            for (const cmd of unitCommands) {
                const cmdId = `${cmd.name}:${bpId}`;

                if (allCommands[cmdId]) {
                    allCommands[cmdId].appliesTo.add(unitId);
                    continue;
                }

                const command: CommandData = {
                    name: cmd.name,
                    args: cmd.args,
                    hotkey: null,
                    appliesTo: new Set([unitId]),
                    canImmediatelyRun: cmd.args.every((arg) => arg.defaultValue !== null),
                    isConfigurable: cmd.args.length > 0,
                    isPositional: cmd.args.length === 1 && cmd.args[0].type === 'position',
                    isPartial: true,
                };
                allCommands[cmdId] = command;
            }
        }

        return Object.values(allCommands).map((cmd, i) => {
            cmd.isPartial = cmd.appliesTo.size < selectedUnitIds.length;
            if (i < DIGIT_KEY_CODES.length) {
                cmd.hotkey = DIGIT_KEY_CODES[i];
            }
            return cmd;
        });
    });

    const executeCommand = (data: CommandData, args: BsmlValue[]) => {
        const unitIds = ui.rSelectedUnits();
        swarms.execUnitCommand(unitIds, {
            name: data.name,
            args,
        });
    };

    const [hoveredCommandTargets, setHoveredCommandTargets] = createSignal<Set<SwarmUnitId> | null>(null);

    return (
        <FloatingPanel pinBottom pinLeft withMargin>
            <FloatingPanelHeader sticky>
                <Header size="sm">Units ({ui.rSelectedUnits().length})</Header>
                <div class={styles.commandPanel}>
                    <For
                        each={availableCommands()}
                        fallback={<div class={styles.noCommandsMessage}>No commands available</div>}
                    >
                        {(commandData) => {
                            let text = commandData.name;

                            if (commandData.isPartial) {
                                text = `${text}*`;
                            }

                            if (commandData.isConfigurable && !commandData.canImmediatelyRun) {
                                text = `${text}...`;
                            }

                            return (
                                <div
                                    class={styles.command}
                                    onMouseEnter={
                                        commandData.isPartial
                                            ? () => setHoveredCommandTargets(commandData.appliesTo)
                                            : undefined
                                    }
                                    onMouseLeave={() => setHoveredCommandTargets(null)}
                                >
                                    <Button
                                        style={commandData.canImmediatelyRun ? 'primary' : 'secondary'}
                                        hotkey={
                                            commandData.hotkey
                                                ? {
                                                      key: commandData.hotkey,
                                                      allowRepeated: false,
                                                  }
                                                : undefined
                                        }
                                        onClick={() => {
                                            if (!commandData.canImmediatelyRun) {
                                                console.log('not implemented yet', commandData);
                                                return;
                                            }

                                            executeCommand(commandData, []);
                                        }}
                                    >
                                        {text}
                                    </Button>
                                    <Show when={commandData.isConfigurable && commandData.canImmediatelyRun}>
                                        <Button style="secondary">{Symbols.Ellipsis}</Button>
                                    </Show>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </FloatingPanelHeader>
            <List insetH class={styles.unitsList}>
                <For each={selectedUnits()} fallback={<ListEmptyContent>Nothing is selected</ListEmptyContent>}>
                    {(unitData) => {
                        return (
                            <ListItem
                                class={(hoveredCommandTargets()?.has(unitData.id) ?? true) ? '' : styles.nonTargetUnit}
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
                                    {unitData.blueprintName}
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
            <div class={styles.actionsFooter}>
                <Show when={selectedUnits().length === 0}>
                    <Button style="secondary">Search...</Button>
                </Show>
                <Show when={selectedUnits().length === 1}>
                    <Button style="secondary">Debug</Button>
                    <span>:roaming</span>
                    <span>H25%</span>
                    <span>E25%</span>
                </Show>
                <Show when={selectedUnits().length > 1}>
                    <Button style="secondary" onClick={() => ui.selectUnits([])}>
                        Clear
                    </Button>
                    <Button style="secondary">Destroy...</Button>
                </Show>
            </div>
        </FloatingPanel>
    );
};
