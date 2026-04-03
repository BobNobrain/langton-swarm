import { createEffect, createSignal, Show, type Component } from 'solid-js';
import type { UnitCommand, UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { FloatingPanel, FloatingPanelHeader, FloatingPanelOverlay } from '../FloatingPanel/FloatingPanel';
import { Header } from '../Header/Header';
import { SelectedUnitsList } from '../SelectedUnitsList/SelectedUnitsList';
import { CommandForm } from './CommandForm/CommandForm';
import { CommandPanel } from './CommandPanel/CommandPanel';
import { UnitDisplay } from './UnitDisplay/UnitDisplay';
import styles from './SelectedUnitsPanel.module.css';
import { StatusBar } from './StatusBar/StatusBar';

type ActiveCommand = {
    cmd: UnitCommand;
    targets: Set<UnitId>;
};

export const SelectedUnitsPanel: Component = () => {
    const { ui, units, deck } = useGame();
    const [hoveredCommandTargets, setHoveredCommandTargets] = createSignal<Set<UnitId> | null>(null);
    const [activeCommand, setActiveCommand] = createSignal<ActiveCommand | null>(null);

    createEffect(() => {
        ui.rSelectedUnits();
        setActiveCommand(null);
    });

    const selectedUnitId = () => {
        const selectedIds = ui.rSelectedUnits();
        if (selectedIds.length !== 1) {
            return null;
        }

        return selectedIds[0];
    };

    return (
        <FloatingPanel pinBottom pinLeft withMargin expandedWidth={selectedUnitId() !== null}>
            <FloatingPanelHeader sticky>
                <Header size="sm">Units ({ui.rSelectedUnits().length})</Header>
                <CommandPanel
                    setHoveredCommandTargets={setHoveredCommandTargets}
                    onExecute={(cmd, targets) => {
                        if (cmd.args.length === 0) {
                            units.executeCommandMany(ui.rSelectedUnits(), {
                                name: cmd.name,
                                args: [],
                            });
                            return;
                        }

                        setActiveCommand({ cmd, targets });
                    }}
                />
            </FloatingPanelHeader>
            <section class={styles.content}>
                <SelectedUnitsList hoveredCommandTargets={hoveredCommandTargets()} />
                <UnitDisplay unitId={selectedUnitId()} />
            </section>
            <footer class={styles.actionsFooter}>
                <Show when={ui.rSelectedUnits().length === 0}>
                    <Button inline style="secondary">
                        Search...
                    </Button>
                </Show>
                <Show when={ui.rSelectedUnits().length === 1}>
                    <StatusBar unitId={selectedUnitId()} />
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
                    command={activeCommand()?.cmd ?? null}
                    onSubmit={(argValues) => {
                        const active = activeCommand();
                        if (!active) {
                            return;
                        }

                        units.executeCommandMany(Array.from(active.targets.values()), {
                            name: active.cmd.name,
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
