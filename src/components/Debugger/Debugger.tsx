import { createMemo, For, type Component } from 'solid-js';
import type { UnitId } from '@/game';
import { renderStateName } from '@/game/program/utils';
import { createCPUStateTracker } from '@/hooks/trackers';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { DebuggerInstruction } from './DebuggerInstruction';
import styles from './Debugger.module.css';

export const Debugger: Component<{
    unitId: UnitId | null;
}> = (props) => {
    const { rCpuIsWaiting, rCpuProgram, rCpuPtr, rCpuStack, rStateName } = createCPUStateTracker(() => props.unitId);

    const currentInstructionsSet = createMemo(() => {
        const program = rCpuProgram();
        if (!program) {
            return [];
        }

        const state = rStateName();
        if (!state) {
            return [];
        }

        const instructions = program.stateInstructions[state] ?? [];
        return instructions;
    });

    return (
        <section class={styles.debugPanel}>
            <header class={styles.debuggerHeader}>
                <Header size="sm">Debugger</Header>
                <DefList>
                    <DefListItem name="State">{renderStateName(rStateName())}</DefListItem>
                    <DefListItem name="Status">{rCpuIsWaiting() ? 'WAITING' : 'RUNNING'}</DefListItem>
                </DefList>
            </header>
            <List class={styles.instructions} hasBorder>
                <For each={currentInstructionsSet()} fallback={<ListEmptyContent>(no instructions)</ListEmptyContent>}>
                    {(instruction, index) => {
                        return (
                            <ListItem selected={index() === rCpuPtr()}>
                                <DebuggerInstruction instruction={instruction} />
                            </ListItem>
                        );
                    }}
                </For>
            </List>
            <List class={styles.stack} hasBorder>
                <For each={rCpuStack()} fallback={<ListEmptyContent>(stack is empty)</ListEmptyContent>}>
                    {(value) => (
                        <ListItem>
                            <BsmlValueLabel value={value} />
                        </ListItem>
                    )}
                </For>
            </List>
        </section>
    );
};
