import { createMemo, For, Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import type { SwarmUnitId, UnitCommandArg, UnitCommand } from '@/game';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { DIGIT_KEY_CODES, type KeyCode } from '@/lib/input';
import styles from './CommandPanel.module.css';

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

export const CommandPanel: Component<{
    onExecute: (cmd: UnitCommand) => void;
    setHoveredCommandTargets: (value: Set<SwarmUnitId> | null) => void;
}> = (props) => {
    const { ui, swarms } = useGame();

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

    return (
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
                        text = `${text}…`;
                    }

                    return (
                        <div
                            class={styles.command}
                            onMouseEnter={
                                commandData.isPartial
                                    ? () => props.setHoveredCommandTargets(commandData.appliesTo)
                                    : undefined
                            }
                            onMouseLeave={() => props.setHoveredCommandTargets(null)}
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
                                onClick={() => props.onExecute({ name: commandData.name, args: commandData.args })}
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
    );
};
