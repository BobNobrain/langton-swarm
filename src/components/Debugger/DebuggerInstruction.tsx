import { createMemo, For, type Component, type JSX } from 'solid-js';
import type { CompiledInstruction } from '@/game/program/compile';
import { BsmlValueLabel } from '../BsmlValueLabel/BsmlValueLabel';
import styles from './Debugger.module.css';
import { absurd } from '@/lib/errors';

export const DebuggerInstruction: Component<{ instruction: CompiledInstruction }> = (props) => {
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

            case 'binop':
            case 'unop':
                result.push(<span class={styles.operator}>{instr.operator}</span>);
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
