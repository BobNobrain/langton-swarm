import { createMemo, createSignal, onCleanup, onMount, type Component } from 'solid-js';
import type { BlueprintId, BsmlValue, BsmlValueType, NodeId } from '@/game';
import { renderTileId } from '@/game/utils';
import { useGame } from '@/gameContext';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { KeyCode } from '@/lib/input';
import { createSelectController, Select, type SelectOption } from '../../Select/Select';
import { TextInput, createTextInputController } from '../../TextInput/TextInput';
import { createToggleController, Toggle } from '../../Toggle/Toggle';
import { NumberInput } from '../../NumberInput/NumberInput';
// import styles from './CommandForm.module.css';

export type ArgInputProps = {
    name: string;
    type: BsmlValueType;
    value: BsmlValue | null;
    onUpdate: (newValue: BsmlValue) => void;
    onFinish: (name: string) => void;
    controllerRef?: ControllerRef<FieldController>;
};

const UnknownTypeInput: Component<ArgInputProps> = (props) => {
    return <>(unsupported type {props.type})</>;
};

const StringInput: Component<ArgInputProps> = (props) => {
    const textInput = createTextInputController();

    provideController(
        {
            focus() {
                textInput.rGet().input?.focus();
            },
        },
        () => props.controllerRef,
    );

    return (
        <TextInput
            value={props.value?.type === 'string' ? props.value.value : ''}
            onUpdate={(value) => props.onUpdate({ type: 'string', value })}
            onKeyDown={(ev) => {
                if (ev.code === KeyCode.Enter) {
                    ev.preventDefault();
                    props.onFinish(props.name);
                }
            }}
            controllerRef={textInput.ref}
        />
    );
};

const FlagInput: Component<ArgInputProps> = (props) => {
    const value = createMemo(() => {
        if (!props.value || props.value.type !== 'flag') {
            return undefined;
        }

        return props.value.value;
    });

    const toggle = createToggleController();
    provideController(
        {
            focus() {
                toggle.rGet().focus();
            },
        },
        () => props.controllerRef,
    );

    return (
        <Toggle
            value={value()}
            onUpdate={(val) => props.onUpdate({ type: 'flag', value: val })}
            controllerRef={toggle.ref}
            label={value() === true ? 'yes' : value() === false ? 'no' : undefined}
            as="div"
        />
    );
};

const NumberArgInput: Component<ArgInputProps> = (props) => {
    const input = createTextInputController();

    provideController(
        {
            focus() {
                input.rGet().input?.focus();
            },
        },
        () => props.controllerRef,
    );

    return (
        <NumberInput
            value={props.value?.type === 'number' ? props.value.value : undefined}
            onUpdate={(value) => props.onUpdate({ type: 'number', value })}
            onKeyDown={(ev) => {
                if (ev.code === KeyCode.Enter) {
                    ev.preventDefault();
                    props.onFinish(props.name);
                }
            }}
            controllerRef={input.ref}
        />
    );
};

const BlueprintInput: Component<ArgInputProps> = (props) => {
    const select = createSelectController();

    provideController(
        {
            focus() {
                select.rGet().focus();
            },
        },
        () => props.controllerRef,
    );

    const { deck } = useGame();
    const options = createMemo(() =>
        deck.rBlueprints().map(
            (bp): SelectOption<BlueprintId> => ({
                value: bp.id,
                text: bp.rName(),
            }),
        ),
    );
    const currentValue = createMemo((): SelectOption<BlueprintId> | null => {
        const selected = props.value;
        if (!selected || selected.type !== 'blueprint') {
            return null;
        }

        return options().find((option) => option.value === (selected.value as BlueprintId)) ?? null;
    });

    return (
        <Select
            value={currentValue()}
            options={options()}
            controllerRef={select.ref}
            direction="up"
            onUpdate={(option) => {
                props.onUpdate({ type: 'blueprint', value: option.value });
                props.onFinish(props.name);
            }}
        />
    );
};

const PositionInput: Component<ArgInputProps> = (props) => {
    const input = createTextInputController();
    const { ui } = useGame();
    const [isFocused, setIsFocused] = createSignal(false);

    provideController(
        {
            focus() {
                input.rGet().input?.focus();
            },
        },
        () => props.controllerRef,
    );

    onCleanup(() => {
        ui.hijackTileSelection(null);
    });

    const tileSelectionHandler = (node: NodeId | null) => {
        if (!node) {
            return;
        }

        props.onUpdate({ type: 'position', value: node });
        props.onFinish(props.name);
    };

    const text = () => {
        if (isFocused()) {
            return '';
        }

        const value = props.value;
        if (value?.type !== 'position') {
            return '--';
        }

        return renderTileId(value.value);
    };

    const placeholder = () => {
        if (!isFocused()) {
            return '';
        }

        const hoveredTile = ui.rHoveredTile();
        return hoveredTile === null ? '(select a tile)' : renderTileId(hoveredTile);
    };

    return (
        <TextInput
            value={text()}
            placeholder={placeholder()}
            controllerRef={input.ref}
            onFocus={() => {
                setIsFocused(true);
                ui.hijackTileSelection(tileSelectionHandler);
            }}
            onBlur={(ev) => {
                setIsFocused(false);
                if (ev.relatedTarget !== null) {
                    ui.hijackTileSelection(null);
                }
            }}
        />
    );
};

export const inputsByType: Record<BsmlValueType, Component<ArgInputProps>> = {
    blueprint: BlueprintInput,
    flag: FlagInput,
    number: NumberArgInput,
    position: PositionInput,
    string: StringInput,

    // these cannot be set
    state: UnknownTypeInput,
    magic: UnknownTypeInput,
};

export type FieldController = {
    focus: () => void;
};

export function createFieldController() {
    return createControllerRef<FieldController>({
        focus: () => {},
    });
}
