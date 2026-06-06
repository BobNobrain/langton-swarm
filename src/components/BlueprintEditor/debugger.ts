import { createMemo } from 'solid-js';
import type { UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { createCPUStateTracker } from '@/hooks/trackers';
import type { CodePosition } from '@/game/program';

export function useDebuggerData() {
    const { ui, playerDeck } = useGame();

    const debuggingUnitId = createMemo((): UnitId | null => {
        const openBlueprint = ui.rDeckSelectedBlueprint();
        if (openBlueprint === null) {
            return null;
        }

        const selectedIds = ui.rSelectedUnits();
        if (selectedIds.length !== 1) {
            return null;
        }

        const found = playerDeck.findByUnitId(selectedIds[0]);
        if (!found) {
            return null;
        }

        if (found.bp.id !== openBlueprint || found.v !== ui.rDeckSelectedVersion()) {
            return null;
        }

        if (!found.bp.rVersions()[found.v]?.config.program) {
            return null;
        }

        return selectedIds[0];
    });

    const { rCpuIsWaiting, rCpuProgram, rCpuPtr, rCpuStack, rCpuStackSources, rStateName, rCpuVars } =
        createCPUStateTracker(debuggingUnitId);
    const debuggerCurrentPosition = (): CodePosition | null => {
        const program = rCpuProgram();
        const ptr = rCpuPtr();
        const state = rStateName();
        if (!program || !ptr || !state) {
            return null;
        }

        return program.sourcemap[ptr] ?? null;
    };

    return {
        debuggerCurrentPosition,
        debuggingUnitId,
        rCpuIsWaiting,
        rCpuProgram,
        rCpuPtr,
        rCpuStack,
        rCpuStackSources,
        rStateName,
        rCpuVars,
    };
}
