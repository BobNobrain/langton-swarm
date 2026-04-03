import { createMemo, Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import { DebuggerInstruction } from '@/components/Debugger/DebuggerInstruction';
import { DefList, DefListItem } from '@/components/DefList/DefList';
import { Inventory } from '@/components/Inventory/Inventory';
import type { UnitId } from '@/game';
import { renderStateName } from '@/game/program/utils';
import { useGame } from '@/gameContext';
import { createCPUStateTracker, createInventoryTracker, createMotherTracker } from '@/hooks/trackers';
import styles from './UnitDisplay.module.css';

export const InventoryTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const inventory = createInventoryTracker(() => props.unitId);
    return <Inventory data={inventory()} />;
};

export const CpuTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    const { ui, deck } = useGame();
    const { rStateName, rCpuIsWaiting, rCpuPtr, rCpuProgram } = createCPUStateTracker(() => props.unitId);
    const currentInstruction = createMemo(() => {
        const program = rCpuProgram();
        const state = rStateName();
        if (!program || !state) {
            return null;
        }

        const instructions = program.stateInstructions[state] ?? [];
        return instructions[rCpuPtr()] ?? null;
    });

    return (
        <>
            <DefList>
                <DefListItem name="State">{renderStateName(rStateName())}</DefListItem>
                <DefListItem name="Waiting">{rCpuIsWaiting() ? 'yes' : 'no'}</DefListItem>
                <DefListItem name="Instruction">
                    <Show when={currentInstruction()} fallback="--">
                        <DebuggerInstruction instruction={currentInstruction()!} />
                    </Show>
                </DefListItem>
            </DefList>
            <footer class={styles.cpuFooter}>
                <Button
                    inline
                    style="secondary"
                    onClick={() => {
                        const unitId = ui.rSelectedUnits()[0];
                        const found = deck.findByUnitId(unitId);

                        if (!found) {
                            return;
                        }

                        ui.deckSelectBlueprint(found.bp.id, found.v);
                    }}
                >
                    Debug
                </Button>
            </footer>
        </>
    );
};

export const NavigatorTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    return <>Navigator...</>;
};

export const ScannerTabContent: Component<{ unitId: UnitId | null }> = (props) => {
    return <>Scanner...</>;
};
