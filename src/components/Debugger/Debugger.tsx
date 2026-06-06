import { createMemo, For, Show, type Component } from 'solid-js';
import type { BsmlValue, UnitId } from '@/game';
import { type CompiledProgram, renderStateName } from '@/game/program';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header, Heading } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { DebuggerInstruction } from './DebuggerInstruction';
import styles from './Debugger.module.css';

type EnrichedStackItem = {
    value: BsmlValue;
    source?: string;
};

export const Debugger: Component<{
    unitId: UnitId | null;
    program: CompiledProgram | null;
    stateName: string | null;
    waitingFor: string;
    ptr: number;
    stack: BsmlValue[];
    stackSources: string[];
    vars: Record<string, BsmlValue>;
}> = (props) => {
    const enrichedStack = () => {
        const stack = props.stack;
        const sources = props.stackSources;
        const result: EnrichedStackItem[] = stack.map((value, i) => ({ value, source: sources[i] }));
        return result;
    };

    return (
        <section class={styles.debugPanel}>
            <div class={styles.debuggerHeader}>
                <Header>
                    <Heading size="sm">Debugger</Heading>
                </Header>
                <DefList>
                    <DefListItem name="State">{renderStateName(props.stateName)}</DefListItem>
                    <DefListItem name="Waiting for">{props.waitingFor}</DefListItem>
                </DefList>
            </div>
            <List class={styles.instructions}>
                <For
                    each={props.program?.instructions ?? []}
                    fallback={<ListEmptyContent>(no instructions)</ListEmptyContent>}
                >
                    {(instruction, index) => {
                        return (
                            <ListItem selected={index() === props.ptr}>
                                <DebuggerInstruction index={index()} instruction={instruction} />
                            </ListItem>
                        );
                    }}
                </For>
            </List>
            <List class={styles.vars}>
                <For each={Object.entries(props.vars)} fallback={<ListEmptyContent>(no variables)</ListEmptyContent>}>
                    {([name, value]) => (
                        <ListItem>
                            <span class={styles.varListName}>{name}</span>
                            <span class={styles.varListEq}>=</span>
                            <BsmlValueLabel value={value} />
                        </ListItem>
                    )}
                </For>
            </List>
            <List class={styles.stack}>
                <For each={enrichedStack()} fallback={<ListEmptyContent>(stack is empty)</ListEmptyContent>}>
                    {({ value, source }) => (
                        <ListItem ellipsis>
                            <BsmlValueLabel value={value} />
                            <Show when={source}>
                                <span class={styles.stackSource} title={source}>
                                    {source}
                                </span>
                            </Show>
                        </ListItem>
                    )}
                </For>
            </List>
        </section>
    );
};
