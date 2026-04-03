import { createMemo, type Component, type JSX } from 'solid-js';
import type { BsmlValue } from '@/game';
import { renderValue } from '@/game/program/utils';
import { absurd } from '@/lib/errors';
import styles from './BsmlValueLabel.module.css';

export const BsmlValueLabel: Component<{ value: BsmlValue | null }> = (props) => {
    const content = createMemo((): JSX.Element => {
        const value = props.value;
        const rendered = renderValue(value);

        if (!value) {
            return <span class={styles.empty}>{rendered}</span>;
        }

        switch (value.type) {
            case 'string':
                return <span class={styles.string}>{rendered}</span>;

            case 'number':
                return <span class={styles.number}>{rendered}</span>;

            case 'blueprint':
                // TODO: blueprint name?
                return <span class={styles.blueprint}>{rendered}</span>;

            case 'flag':
                return (
                    <span
                        class={styles.flag}
                        classList={{
                            [styles.yes]: value.value,
                            [styles.no]: !value.value,
                        }}
                    >
                        {rendered}
                    </span>
                );

            case 'position':
                return <span class={styles.position}>{rendered}</span>;

            case 'state':
                return <span class={styles.state}>{rendered}</span>;

            case 'magic':
                return <span class={styles.magic}>{rendered}</span>;

            case 'null':
                return <span class={styles.null}>{rendered}</span>;

            default:
                return absurd(value);
        }
    });

    return <>{content()}</>;
};
