import { createMemo, type Component, type JSX } from 'solid-js';
import type { CompiledInstruction } from '@/game/program/compile';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import styles from './Debugger.module.css';

const HINTS: Record<CompiledInstruction['type'], string> = {
    assign: 'Moves last stack value into a variable',
    binop: 'Replaces last 2 stack items with a result of a binary operation on them',
    call: 'CALL(n) removes last n items from the stack and uses them as arguments to call a function',
    jump: 'Jumps to the instruction at specified 0-based index',
    jumpz: 'Removes last value from the stack and jumps to the instruction at specified 0-based index – but only if the value is zero-ish',
    pop: 'Removes last value from the stack',
    push: 'Puts a value onto the stack',
    read: 'Reads a variable and puts its value onto the stack',
    setstate:
        'SETSTATE(n) removes last n+1 items from the stack, uses the first to change the current state, and the rest as arguments to that state',
    unop: 'Replaces the last stack item with a result of an unary operator, acted on that item',
    ret: 'Indicates the end of an event handler, returns program state to where it was interrupted by the event',
};

export const DebuggerInstruction: Component<{ index: number; instruction: CompiledInstruction }> = (props) => {
    const args = createMemo(() => {
        const result: JSX.Element[] = [];
        const instr = props.instruction;

        switch (instr.type) {
            case 'assign':
            case 'read':
                result.push(<span class={styles.varName}>{instr.debugVarName}</span>);
                break;

            case 'call':
                result.push(<span class={styles.nargs}>({instr.nargs})</span>);
                result.push(
                    <span class={styles.funcName} title={instr.fname}>
                        {instr.fname}
                    </span>,
                );
                break;

            case 'jumpz':
                result.push(<span class={styles.jumppos}>{instr.position}</span>);
                break;

            case 'push':
                result.push(<BsmlValueLabel value={instr.value} />);
                break;

            case 'setstate':
                result.push(<span class={styles.nargs}>({instr.nargs})</span>);
                break;

            case 'binop':
            case 'unop':
                result.push(<span class={styles.operator}>{instr.operator}</span>);
                break;
        }

        return result;
    });

    return (
        <span class={styles.instruction} title={HINTS[props.instruction.type]}>
            <span class={styles.instructionIndex}>{props.index.toString()}</span>
            <span class={styles.instructionName}>{props.instruction.type}</span>
            {args()}
        </span>
    );
};
