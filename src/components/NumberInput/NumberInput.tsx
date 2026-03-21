import { createEffect, createSignal, splitProps, type Component } from 'solid-js';
import { TextInput, type TextInputProps } from '../TextInput/TextInput';

type NumberInputProps = Omit<TextInputProps, 'value' | 'onUpdate'> & {
    value: number | undefined;
    onUpdate?: (value: number) => void;
};

export const NumberInput: Component<NumberInputProps> = (props) => {
    const [_, restProps] = splitProps(props, ['value', 'onUpdate', 'onBlur']);
    const [text, setText] = createSignal((props.value ?? '').toString());
    let parsedValue = props.value;

    createEffect(() => {
        if (props.value !== parsedValue) {
            setText((props.value ?? '').toString());
        }
    });

    return (
        <TextInput
            value={text()}
            onUpdate={(text) => {
                if (!props.onUpdate) {
                    return;
                }

                setText(text);

                const n = Number(text);
                if (!Number.isNaN(n) && Number.isFinite(n)) {
                    parsedValue = n;
                    props.onUpdate(n);
                }
            }}
            onBlur={(ev) => {
                setText((props.value ?? '').toString());
                props.onBlur?.(ev);
            }}
            {...restProps}
        />
    );
};
