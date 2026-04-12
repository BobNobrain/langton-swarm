import { createMemo, For, onMount, Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import type { UnitId, UnitCommandArg, UnitCommand, BsmlValue } from '@/game';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { DIGIT_KEY_CODES, type KeyCode } from '@/lib/input';
import styles from './CommandPanel.module.css';
import { createEventListener } from '@/hooks/events';

type CommandData = {
    name: string;
    args: UnitCommandArg[];
    hotkey: KeyCode | null;
    appliesTo: Set<UnitId>;
    canImmediatelyRun: boolean;
    isConfigurable: boolean;
    isPositional: boolean;
    isPartial: boolean;
};

export const CommandPanel: Component<{
    onExecute: (cmd: UnitCommand, targets: Set<UnitId>, args?: BsmlValue[]) => void;
    setHoveredCommandTargets: (value: Set<UnitId> | null) => void;
}> = (props) => {
    const { ui, units, deck } = useGame();

    const availableCommands = createMemo(() => {
        const selectedUnitIds = ui.rSelectedUnits();
        const allCommands: Record<string, CommandData> = {};

        for (const unitId of selectedUnitIds) {
            const found = deck.findByUnitId(unitId);
            if (!found) {
                continue;
            }

            const bpId = `${found.bp.id}v${found.v}`;
            const unitCommands = units.queryCommands(unitId);
            let foundPositional = false;

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
                    isPositional: foundPositional ? false : cmd.args.length === 1 && cmd.args[0].type === 'position',
                    isPartial: true,
                };
                if (command.isPositional) {
                    foundPositional = true;
                }
                allCommands[cmdId] = command;
            }
        }

        let hotkeyIndex = 0;
        const cmdList = Object.values(allCommands);
        for (const cmd of cmdList) {
            cmd.isPartial = cmd.appliesTo.size < selectedUnitIds.length;

            if (cmd.isPositional) {
                continue;
            }
            if (hotkeyIndex >= DIGIT_KEY_CODES.length) {
                break;
            }

            cmd.hotkey = DIGIT_KEY_CODES[hotkeyIndex];
            ++hotkeyIndex;
        }

        return cmdList;
    });

    onMount(() =>
        createEventListener(ui.tileRightClick, (tileId, ev) => {
            const positionalCommand = availableCommands().find((cmd) => cmd.isPositional);
            if (!positionalCommand) {
                return;
            }

            ev.preventDefault();

            props.onExecute({ name: positionalCommand.name, args: [] }, positionalCommand.appliesTo, [
                { type: 'position', value: tileId },
            ]);
            ui.selectTile(tileId, { selectUnits: false });
        }),
    );

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

                    if (commandData.isConfigurable && !commandData.canImmediatelyRun && !commandData.isPositional) {
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
                                rmbHotkey={commandData.isPositional}
                                onClick={() =>
                                    props.onExecute(
                                        { name: commandData.name, args: commandData.args },
                                        commandData.appliesTo,
                                    )
                                }
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
