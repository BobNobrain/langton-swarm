import { createMemo, For, type Component } from 'solid-js';
import type { BsmlValue, UnitId } from '@/game';
import { type CompiledProgram, renderStateName } from '@/game/program';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import { DefList, DefListItem } from '../DefList/DefList';
import { Heading } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { DebuggerInstruction } from './DebuggerInstruction';
import styles from './Debugger.module.css';

export const Debugger: Component<{
    unitId: UnitId | null;
    program: CompiledProgram | null;
    stateName: string | null;
    waitingFor: string;
    ptr: number;
    stack: BsmlValue[];
}> = (props) => {
    const currentInstructionsSet = createMemo(() => {
        const program = props.program;
        if (!program) {
            return [];
        }

        const state = props.stateName;
        if (!state) {
            return [];
        }

        const instructions = program.stateInstructions[state] ?? [];
        return instructions;
    });

    return (
        <section class={styles.debugPanel}>
            <header class={styles.debuggerHeader}>
                <Heading size="sm">Debugger</Heading>
                <DefList>
                    <DefListItem name="State">{renderStateName(props.stateName)}</DefListItem>
                    <DefListItem name="Waiting for">{props.waitingFor}</DefListItem>
                </DefList>
            </header>
            <List class={styles.instructions} hasBorder>
                <For each={currentInstructionsSet()} fallback={<ListEmptyContent>(no instructions)</ListEmptyContent>}>
                    {(instruction, index) => {
                        return (
                            <ListItem selected={index() === props.ptr}>
                                <DebuggerInstruction instruction={instruction} />
                            </ListItem>
                        );
                    }}
                </For>
            </List>
            <List class={styles.stack} hasBorder>
                <For each={props.stack} fallback={<ListEmptyContent>(stack is empty)</ListEmptyContent>}>
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
