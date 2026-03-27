import { createEffect, createMemo, createSignal, For, onCleanup, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { BsmlValue, UnitCommand } from '@/game';
import { KeyCode } from '@/lib/input';
import { Button, createButtonController } from '../../Button/Button';
import { createFieldController, inputsByType } from './inputs';
import styles from './CommandForm.module.css';
import { FormField } from '../../FormField/FormField';
import { useGame } from '@/gameContext';
import { createTimeout } from '@/lib/timeouts';

export const CommandForm: Component<{
    command: UnitCommand | null;
    onSubmit: (argValues: BsmlValue[]) => void;
    onCancel: () => void;
}> = (props) => {
    const { ui } = useGame();

    const args = createMemo(() => props.command?.args ?? []);
    const [values, setValues] = createSignal<Record<string, BsmlValue | null>>({});
    const controllers: Record<string, ReturnType<typeof createFieldController>> = {};
    const submitButton = createButtonController();

    const autofocusTimeout = createTimeout(0);

    createEffect(() => {
        const command = props.command;
        const newValues: Record<string, BsmlValue | null> = {};

        for (const key of Object.keys(controllers)) {
            delete controllers[key];
        }

        for (const arg of command?.args ?? []) {
            newValues[arg.name] = arg.defaultValue;
            controllers[arg.name] = createFieldController();
        }

        setValues(newValues);

        autofocusTimeout.schedule(() => {
            if (command && command.args.length) {
                controllers[command.args[0].name].rGet().focus();
            }
        });
    });

    const allTileIdArgvs = createMemo(() =>
        Object.values(values())
            .filter((v) => v?.type === 'position')
            .map((v) => v.value),
    );

    createEffect(() => {
        const tileIds = allTileIdArgvs();
        for (const tileId of tileIds) {
            ui.addHighlightedTile({ tileId, color: 'white' });
        }

        onCleanup(() => {
            for (const tileId of tileIds) {
                ui.removeHighlightedTile(tileId);
            }
        });
    });

    const onFinish = (name: string) => {
        if (!props.command) {
            return;
        }

        const currentIndex = props.command.args.findIndex((cmd) => cmd.name === name);
        if (currentIndex === props.command.args.length - 1) {
            submitButton.rGet().focus();
            return;
        }

        const nextArg = props.command.args[currentIndex + 1];
        const fieldController = controllers[nextArg.name];
        fieldController.rGet().focus();
    };

    return (
        <form
            class={styles.form}
            onSubmit={(ev) => {
                ev.preventDefault();

                const cmd = props.command;
                if (!cmd) {
                    return;
                }

                const argv: BsmlValue[] = [];
                const vals = values();
                for (const arg of cmd.args) {
                    const val = vals[arg.name];
                    if (!val) {
                        return;
                    }

                    argv.push(val);
                }

                props.onSubmit(argv);
            }}
        >
            <header class={styles.header}>&gt; {props.command?.name ?? '--'}</header>
            <For each={args()}>
                {(arg) => {
                    const component = inputsByType[arg.type];

                    return (
                        <FormField
                            label={arg.name}
                            done={values()[arg.name] !== null}
                            error={values()[arg.name] === null}
                        >
                            <Dynamic
                                component={component}
                                name={arg.name}
                                type={arg.type}
                                value={values()[arg.name] ?? null}
                                onUpdate={(newValue) => {
                                    setValues((old) => ({ ...old, [arg.name]: newValue }));
                                }}
                                onFinish={onFinish}
                                controllerRef={controllers[arg.name].ref}
                            />
                        </FormField>
                    );
                }}
            </For>
            <footer class={styles.actions}>
                <Button
                    style="primary"
                    disabled={Object.values(values()).some((v) => v === null)}
                    hotkey={{ key: KeyCode.Enter, ctrl: true }}
                    controllerRef={submitButton.ref}
                    type="submit"
                >
                    Execute
                </Button>
                <Button hotkey={{ key: KeyCode.Esc }} onClick={() => props.onCancel()}>
                    Cancel
                </Button>
            </footer>
        </form>
    );
};
