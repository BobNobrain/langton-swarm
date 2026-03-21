import { createEffect, createSignal, Show, type Component } from 'solid-js';
import type { SwarmUnitId, UnitCommand, UnitCommandArg } from '@/game';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { FloatingPanel, FloatingPanelHeader, FloatingPanelOverlay } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { SelectedUnitsList } from '../SelectedUnitsList/SelectedUnitsList';
import { CommandPanel } from './CommandPanel/CommandPanel';
import styles from './SelectedUnitsPanel.module.css';
import { CommandForm } from './CommandForm/CommandForm';

export const SelectedUnitsPanel: Component = () => {
    const { ui, swarms } = useGame();
    const [hoveredCommandTargets, setHoveredCommandTargets] = createSignal<Set<SwarmUnitId> | null>(null);
    const [activeCommand, setActiveCommand] = createSignal<UnitCommand | null>(null);

    createEffect(() => {
        ui.rSelectedUnits();
        setActiveCommand(null);
    });

    return (
        <FloatingPanel pinBottom pinLeft withMargin>
            <FloatingPanelHeader sticky>
                <Header size="sm">Units ({ui.rSelectedUnits().length})</Header>
                <CommandPanel
                    setHoveredCommandTargets={setHoveredCommandTargets}
                    onExecute={(cmd) => {
                        if (cmd.args.length === 0) {
                            swarms.execUnitCommand(ui.rSelectedUnits(), {
                                name: cmd.name,
                                args: [],
                            });
                            return;
                        }

                        setActiveCommand(cmd);
                    }}
                />
            </FloatingPanelHeader>
            <SelectedUnitsList hoveredCommandTargets={hoveredCommandTargets()} />
            <footer class={styles.actionsFooter}>
                <Show when={ui.rSelectedUnits().length === 0}>
                    <Button inline style="secondary">
                        Search...
                    </Button>
                </Show>
                <Show when={ui.rSelectedUnits().length === 1}>
                    <Button inline style="secondary">
                        Debug
                    </Button>
                    <span>:roaming</span>
                    <span>H25%</span>
                    <span>E25%</span>
                </Show>
                <Show when={ui.rSelectedUnits().length > 1}>
                    <Button style="secondary" onClick={() => ui.selectUnits([])}>
                        Clear
                    </Button>
                    <Button style="secondary">Destroy...</Button>
                </Show>
            </footer>
            <FloatingPanelOverlay visible={activeCommand() !== null}>
                <CommandForm
                    command={activeCommand()}
                    onSubmit={(argValues) => {
                        const cmd = activeCommand();
                        console.log(cmd, argValues);
                        if (!cmd) {
                            return;
                        }

                        swarms.execUnitCommand(ui.rSelectedUnits(), {
                            name: cmd.name,
                            args: argValues,
                        });

                        setActiveCommand(null);
                    }}
                    onCancel={() => setActiveCommand(null)}
                />
            </FloatingPanelOverlay>
        </FloatingPanel>
    );
};
