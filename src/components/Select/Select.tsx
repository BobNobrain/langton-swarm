import { createEffect, createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { KeyCode } from '@/lib/input';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { createTextInputController, TextInput } from '../TextInput/TextInput';
import styles from './Select.module.css';

export type SelectOption<T> = {
    text: string;
    value: T;
};

type SelectProps<T> = {
    value: SelectOption<T> | null;
    options: SelectOption<T>[];
    label?: string;
    direction?: 'up' | 'down';
    onUpdate?: (value: SelectOption<T>) => void;
    controllerRef?: ControllerRef<SelectController>;
};

export function Select<T>(props: SelectProps<T>): JSX.Element {
    const [search, setSearch] = createSignal('');
    const [optionsVisible, setOptionsVisible] = createSignal(false);
    const [selectedIndex, setSelectedIndex] = createSignal(0);

    const filteredOptions = createMemo(() => {
        const term = search().trim().toLocaleLowerCase();
        const filtered = term
            ? props.options.filter((item) => item.text.toLocaleLowerCase().includes(term))
            : props.options.slice();

        if (props.direction === 'up') {
            filtered.reverse();
        }
        return filtered;
    });

    createEffect(() => {
        const newValue = props.value;
        const selectedItemIndex = newValue
            ? filteredOptions().findIndex((option) => option.value === newValue.value)
            : -1;

        if (selectedItemIndex === -1) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(selectedItemIndex);
        }
    });

    const selectedOption = createMemo(() => {
        const opts = filteredOptions();
        if (!opts.length) {
            return null;
        }

        const index = Math.max(0, Math.min(selectedIndex(), opts.length - 1));
        return opts[index];
    });

    const updateIndex = (change: number) => {
        setSelectedIndex((old) => {
            const min = 0;
            const max = filteredOptions().length - 1;
            const effectiveIndex = Math.max(min, Math.min(old, max));
            return Math.max(min, Math.min(effectiveIndex + change, max));
        });
    };

    const searchInput = createTextInputController();
    provideController(
        {
            focus() {
                searchInput.rGet().input?.focus();
            },
        },
        () => props.controllerRef,
    );

    let isBlurBecauseOptionsClick = false;

    const textInputValue = createMemo(() => {
        if (optionsVisible()) {
            return search();
        }

        return props.value?.text ?? '--';
    });

    return (
        <div class={styles.select}>
            <TextInput
                value={textInputValue()}
                onUpdate={(val) => {
                    setSearch(val);
                }}
                placeholder="Search options..."
                onFocus={() => {
                    console.log('Select > TextInput.onFocus', performance.now());
                    setOptionsVisible(true);
                    setSearch('');
                }}
                onBlur={() => {
                    console.log('Select > TextInput.onBlur', performance.now());
                    if (isBlurBecauseOptionsClick) {
                        isBlurBecauseOptionsClick = false;
                        return;
                    }

                    setOptionsVisible(false);
                }}
                onKeyDown={(ev) => {
                    switch (ev.code) {
                        case KeyCode.Enter: {
                            ev.preventDefault();

                            const selected = selectedOption();
                            if (selected && props.onUpdate) {
                                props.onUpdate(selected);
                            }
                            break;
                        }

                        case KeyCode.ArrowUp:
                            updateIndex(-1);
                            ev.preventDefault();
                            break;

                        case KeyCode.ArrowDown:
                            updateIndex(+1);
                            ev.preventDefault();
                            break;
                    }
                }}
                controllerRef={searchInput.ref}
            />
            <div
                class={styles.optionsWrapper}
                classList={{
                    [styles.open]: optionsVisible(),
                    [styles.directionUp]: props.direction === 'up',
                }}
                onMouseDown={() => {
                    console.log('Select > optionsWrapper.onMouseDown', performance.now());
                    isBlurBecauseOptionsClick = true;
                }}
            >
                <List hasBorder>
                    <For
                        each={filteredOptions()}
                        fallback={<ListEmptyContent>Nothing found for "{search()}"</ListEmptyContent>}
                    >
                        {(option, index) => {
                            return (
                                <ListItem
                                    selected={index() === selectedIndex()}
                                    onClick={(ev) => {
                                        console.log('Select > ListItem.onClick', performance.now());
                                        ev.preventDefault();
                                        searchInput.rGet().input?.focus();
                                        props.onUpdate?.(option);
                                    }}
                                >
                                    {option.text}
                                </ListItem>
                            );
                        }}
                    </For>
                </List>
            </div>
        </div>
    );
}

export type SelectController = {
    focus(): void;
};

export function createSelectController() {
    return createControllerRef<SelectController>({
        focus() {},
    });
}
