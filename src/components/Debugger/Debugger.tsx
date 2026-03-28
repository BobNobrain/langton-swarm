import { createMemo, createSignal, For, type Component, type JSX } from 'solid-js';
import type { BsmlValue, UnitId } from '@/game';
import { renderStateName } from '@/game/program/utils';
import type { CompiledInstruction, CompiledProgram } from '@/game/program/compile';
import { useGame } from '@/gameContext';
import { onTickConditional } from '@/hooks/onTick';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header } from '../Header/Header';
import { List, ListEmptyContent, ListItem } from '../List/List';
import styles from './Debugger.module.css';

const DebuggerInstruction: Component<{ instruction: CompiledInstruction }> = (props) => {
    const args = createMemo(() => {
        const result: JSX.Element[] = [];
        const instr = props.instruction;

        switch (instr.type) {
            case 'assign':
            case 'read':
                result.push(<span class={styles.varName}>{instr.name}</span>);
                break;

            case 'call':
                result.push(<span class={styles.funcName}>{instr.fname}</span>);
                result.push(<span class={styles.nargs}>{instr.nargs}</span>);
                break;

            case 'jumpz':
                result.push(<span class={styles.nargs}>{instr.position}</span>);
                break;

            case 'push':
                result.push(<BsmlValueLabel value={instr.value} />);
                break;

            case 'setstate':
                result.push(<span class={styles.nargs}>{instr.nargs}</span>);
                break;
        }

        return result;
    });

    return (
        <span class={styles.instruction}>
            <span class={styles.instructionName}>{props.instruction.type}</span>
            {args()}
        </span>
    );
};

export const Debugger: Component<{
    unitId: UnitId | null;
}> = (props) => {
    const { units } = useGame();

    let lastUpdated = -1;
    const [cpuStack, setCpuStack] = createSignal<BsmlValue[]>([]);
    const [cpuPtr, setCpuPtr] = createSignal(0);
    const [stateName, setStateName] = createSignal<string | null>(null);
    const [cpuIsWaiting, setCpuIsWaiting] = createSignal(false);

    let unitIdForProgram: UnitId | null = null;
    const [cpuProgram, setCpuProgram] = createSignal<CompiledProgram | null>(null);

    onTickConditional(
        () => props.unitId,
        (unitId) => () => {
            const cpu = units.cpu.getData(unitId);

            if (!cpu) {
                if (lastUpdated > 0) {
                    setCpuStack([]);
                    setCpuPtr(0);
                    setStateName(null);
                    setCpuProgram(null);
                    setCpuIsWaiting(false);
                }

                return;
            }

            if (unitId !== unitIdForProgram) {
                setCpuProgram(cpu.program);
            }

            if (lastUpdated >= cpu.lastUpdated) {
                return;
            }

            setCpuStack(cpu.stack.slice());
            setCpuPtr(cpu.ptr >= cpu.program.stateInstructions[cpu.state].length ? 0 : cpu.ptr);
            setStateName(cpu.state);
            setCpuIsWaiting(cpu.isWaitingForReturn);
            lastUpdated = cpu.lastUpdated;
        },
    );

    const currentInstructionsSet = createMemo(() => {
        const program = cpuProgram();
        if (!program) {
            return [];
        }

        const state = stateName();
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
                    <DefListItem name="State">{renderStateName(stateName())}</DefListItem>
                    <DefListItem name="Status">{cpuIsWaiting() ? 'WAITING' : 'RUNNING'}</DefListItem>
                </DefList>
            </header>
            <List class={styles.instructions} hasBorder>
                <For each={currentInstructionsSet()} fallback={<ListEmptyContent>(no instructions)</ListEmptyContent>}>
                    {(instruction, index) => {
                        return (
                            <ListItem selected={index() === cpuPtr()}>
                                <DebuggerInstruction instruction={instruction} />
                            </ListItem>
                        );
                    }}
                </For>
            </List>
            <List class={styles.stack} hasBorder>
                <For each={cpuStack()} fallback={<ListEmptyContent>(stack is empty)</ListEmptyContent>}>
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
