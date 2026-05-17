import { createEffect, createSignal, Show, type Component } from 'solid-js';
import type { BlueprintId, UnitCommand, UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { FloatingPanel, FloatingPanelHeader, FloatingPanelOverlay } from '../FloatingPanel/FloatingPanel';
import { Heading } from '../Header/Header';
import { CommandForm } from './CommandForm/CommandForm';
import { CommandPanel } from './CommandPanel/CommandPanel';
import { StatusBar } from './StatusBar/StatusBar';
import { UnitDisplay } from './UnitDisplay/UnitDisplay';
import { UnitList } from '../UnitList/UnitList';
import styles from './SelectedUnitsPanel.module.css';

type ActiveCommand = {
    cmd: UnitCommand;
    targets: Set<UnitId>;
};

export const SelectedUnitsPanel: Component = () => {
    const { ui, units, playerDeck } = useGame();
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
                <Heading size="sm">Units ({ui.rSelectedUnits().length})</Heading>
                <CommandPanel
                    setHoveredCommandTargets={setHoveredCommandTargets}
                    onExecute={(cmd, targets, argv) => {
                        if (cmd.args.length === 0 || argv) {
                            units.executeCommandMany(ui.rSelectedUnits(), {
                                name: cmd.name,
                                args: argv ?? [],
                            });
                            return;
                        }

                        setActiveCommand({ cmd, targets });
                    }}
                />
            </FloatingPanelHeader>
            <section class={styles.content}>
                <UnitList
                    unitIds={ui.rSelectedUnits()}
                    hoveredCommandTargets={hoveredCommandTargets()}
                    onUnitBlueprintClick={(bpId) => {
                        ui.selectUnits(playerDeck.getBlueprint(bpId)!.rUnitIdsFlat());
                    }}
                    onUnitBlueprintVersionClick={(bpId, version) => {
                        ui.selectUnits(playerDeck.getBlueprint(bpId)!.rUnitIds()[version] ?? []);
                    }}
                    unitActions={({ id }) => {
                        return (
                            <>
                                <Button style="text" onClick={() => ui.selectUnits([id])}>
                                    SEL
                                </Button>
                                <Button style="text" onClick={() => ui.removeSelectedUnit(id)}>
                                    RM
                                </Button>
                            </>
                        );
                    }}
                    hideUnitActions={ui.rSelectedUnits().length === 1}
                    empty="Nothing selected"
                />
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
