import { createEffect, createMemo, createSignal, For, Show, type Component, type JSX } from 'solid-js';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { KeyCode } from '@/lib/input';
import { List, ListEmptyContent, ListItem } from '../List/List';
import { createTextInputController, TextInput } from '../TextInput/TextInput';
import styles from './Select.module.css';
import { Symbols } from '@/lib/ascii';
import { createBoundsTracker } from '@/lib/BoundsTracker';
import { Dynamic } from 'solid-js/web';

export type SelectOption<T> = {
    text: string;
    value: T;
};

export type SelectCustomOptionProps<T> = {
    value: T;
    text: string;
    selected: boolean;
    onClick: (ev: MouseEvent) => void;
};

type SelectProps<T> = {
    value: SelectOption<T> | null;
    options: SelectOption<T>[];
    direction?: 'up' | 'down';
    popupOpening?: 'auto' | 'manual';
    dark?: boolean;
    sidewaySwitchable?: boolean;
    onUpdate?: (value: SelectOption<T>) => void;
    controllerRef?: ControllerRef<SelectController>;
    customOption?: Component<SelectCustomOptionProps<T>>;
};

function DefaultOption<T>(props: SelectCustomOptionProps<T>): JSX.Element {
    return (
        <ListItem selected={props.selected} onClick={props.onClick}>
            {props.text}
        </ListItem>
    );
}

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

    const selectAdjacentOption = (change: -1 | 1) => {
        if (!props.onUpdate) {
            return;
        }

        const currentValue = props.value;
        const options = props.options;
        const currentIndex = currentValue ? options.findIndex((option) => option.value === currentValue.value) : -1;
        if (currentIndex === -1) {
            return;
        }

        let newIndex = currentIndex + change;
        if (newIndex < 0) {
            newIndex = options.length - 1;
        } else if (newIndex >= options.length) {
            newIndex = 0;
        }

        if (newIndex === currentIndex) {
            return;
        }

        const newOption = options[newIndex];
        props.onUpdate(newOption);
    };

    const searchInput = createTextInputController();
    provideController(
        {
            focus() {
                searchInput.rGet().input?.focus();
            },
            blur() {
                searchInput.rGet().input?.blur();
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

    const selectOption = (value: SelectOption<T>) => {
        if (!props.onUpdate) {
            return;
        }

        props.onUpdate(value);
        if (props.popupOpening === 'manual') {
            setOptionsVisible(false);
        }
    };

    const wrapper = createBoundsTracker<HTMLDivElement>();
    const optionsStyles = createMemo(() => {
        const bounds = wrapper.getBounds();

        return {
            '--select-anchor-left': bounds.left + 'px',
            '--select-anchor-top': bounds.bottom + 'px',
            '--select-anchor-bottom': document.body.getBoundingClientRect().height - bounds.top + 'px',
            '--select-width': bounds.width + 'px',
        };
    });

    return (
        <div
            class={styles.select}
            ref={wrapper.ref}
            classList={{
                [styles.padLeft]: Boolean(props.sidewaySwitchable && props.value && props.onUpdate),
                [styles.padRight]: true,
            }}
        >
            <TextInput
                value={textInputValue()}
                onUpdate={(val) => {
                    setSearch(val);
                }}
                readonly={!optionsVisible()}
                placeholder="Search options..."
                onFocus={() => {
                    setOptionsVisible(true);
                    setSearch('');
                }}
                onBlur={() => {
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
                            if (selected) {
                                selectOption(selected);
                            }
                            break;
                        }

                        case KeyCode.ArrowUp:
                        case KeyCode.ArrowDown:
                            if (optionsVisible()) {
                                updateIndex(ev.code === KeyCode.ArrowUp ? -1 : +1);
                                ev.preventDefault();
                            } else if (props.onUpdate) {
                                selectAdjacentOption(ev.code === KeyCode.ArrowUp ? -1 : +1);
                                ev.preventDefault();
                            }
                            break;

                        case KeyCode.ArrowLeft:
                        case KeyCode.ArrowRight:
                            if (props.sidewaySwitchable && props.onUpdate && props.value) {
                                selectAdjacentOption(ev.code === KeyCode.ArrowLeft ? -1 : 1);
                                ev.preventDefault();
                            }
                    }
                }}
                onClick={() => {
                    if (props.popupOpening === 'manual') {
                        setOptionsVisible(true);
                    }
                }}
                controllerRef={searchInput.ref}
                dark={props.dark}
            />
            <div
                class={styles.optionsWrapper}
                classList={{
                    [styles.open]: optionsVisible(),
                    [styles.directionUp]: props.direction === 'up',
                }}
                style={optionsStyles()}
                onMouseDown={() => {
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
                                <Dynamic
                                    component={props.customOption ?? DefaultOption}
                                    selected={index() === selectedIndex()}
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        searchInput.rGet().input?.focus();
                                        selectOption(option);
                                    }}
                                    text={option.text}
                                    value={option.value}
                                />
                            );
                        }}
                    </For>
                </List>
            </div>
            <Show
                when={props.sidewaySwitchable && props.value && props.onUpdate}
                fallback={<div class={styles.icon}>{Symbols.TriangleDownSmall}</div>}
            >
                <div
                    class={styles.sideswitch}
                    onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        selectAdjacentOption(-1);
                    }}
                >
                    {Symbols.TriangleLeftSmall}
                </div>
                <div
                    class={styles.sideswitch}
                    onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        selectAdjacentOption(+1);
                    }}
                >
                    {Symbols.TriangleRightSmall}
                </div>
            </Show>
        </div>
    );
}

export type SelectController = {
    focus(): void;
    blur(): void;
};

export function createSelectController() {
    return createControllerRef<SelectController>({
        focus() {},
        blur() {},
    });
}
