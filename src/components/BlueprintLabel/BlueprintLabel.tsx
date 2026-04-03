import { Show, type Component } from 'solid-js';
import styles from './BlueprintLabel.module.css';

export const BlueprintLabel: Component<{
    name: string;
    version?: number;
    onNameClick?: (ev: MouseEvent) => void;
    onVersionClick?: (ev: MouseEvent) => void;
}> = (props) => {
    return (
        <>
            <span
                class={styles.name}
                classList={{
                    [styles.clickable]: Boolean(props.onNameClick),
                }}
                role={props.onNameClick ? 'button' : undefined}
                onClick={props.onNameClick}
            >
                {props.name}
            </span>
            <Show when={props.version !== undefined}>
                <span
                    class={styles.version}
                    classList={{
                        [styles.clickable]: Boolean(props.onVersionClick),
                    }}
                    role={props.onVersionClick ? 'button' : undefined}
                    onClick={props.onVersionClick}
                >
                    v.{props.version!.toString()}
                </span>
            </Show>
        </>
    );
};
