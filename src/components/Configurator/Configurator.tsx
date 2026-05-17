import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import { DrillConfiguration, EngineConfiguration, StorageConfiguration } from '@/game/config';
import { Symbols } from '@/lib/ascii';
import { triggerResize } from '@/lib/BoundsTracker';
import { Button, createButtonController } from '../Button/Button';
import { Floater } from '../Floater/Floater';
import { Header, Heading } from '../Header/Header';
import { UnitComponents, UnitComponentWrapper } from './components';
import { ConfiguratorTotals } from './Totals';
import styles from './Configurator.module.css';
import { List, ListEmptyContent, ListItem } from '../List/List';

export const Configurator: Component<{
    value: UnitConfiguration;
    readonly: boolean;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
}> = (props) => {
    const addButton = createButtonController();
    const [isAddButtonOpen, setAddButtonOpen] = createSignal(false);

    const missingComponents = createMemo(() => {
        return UnitComponents.filter((c) => !c.isPresent(props.value));
    });

    return (
        <div class={styles.configurator}>
            <Show when={props.readonly}>
                <div class={styles.readonlyBanner}>
                    The components of this blueprint have been locked, because it was used to build a unit. You now can
                    only change unit's program. To change the components, you can duplicate this blueprint.
                    <Button>Duplicate</Button>
                </div>
            </Show>
            <Header padded>
                <Heading size="sm" withMargin>
                    Components
                </Heading>
            </Header>
            <section class={styles.componentList}>
                <For each={UnitComponents}>
                    {(component) => {
                        return (
                            <UnitComponentWrapper
                                component={component}
                                config={props.value}
                                onUpdate={props.onUpdate}
                                readonly={props.readonly}
                            />
                        );
                    }}
                </For>
            </section>
            <Show when={!props.readonly}>
                <footer class={styles.componentActions}>
                    <Show when={!props.value.engine}>
                        <Button
                            onClick={() => {
                                props.onUpdate({ engine: EngineConfiguration.Tier1Cheap, navigator: true });
                            }}
                        >
                            +Engine
                        </Button>
                    </Show>
                    <Show when={!props.value.storage}>
                        <Button
                            onClick={() => {
                                props.onUpdate({ storage: StorageConfiguration.Tier1Small });
                            }}
                        >
                            +Storage
                        </Button>
                    </Show>
                    <Show when={!props.value.drill}>
                        <Button
                            onClick={() => {
                                props.onUpdate({
                                    drill: DrillConfiguration.Tier1,
                                    scanner: true,
                                    storage: props.value.storage ?? StorageConfiguration.Tier1Regular,
                                });
                            }}
                        >
                            +Mining
                        </Button>
                    </Show>

                    <Button
                        controllerRef={addButton.ref}
                        onClick={() => {
                            triggerResize();
                            setAddButtonOpen(true);
                        }}
                    >
                        Add component{Symbols.Ellipsis}
                    </Button>
                </footer>
            </Show>
            <Show when={isAddButtonOpen() && !props.readonly}>
                <Floater
                    target={addButton.rGet().bounds()}
                    horizontalAnchor="right"
                    horizontalDirection="left"
                    verticalAnchor="bottom"
                    verticalDirection="down"
                    useTargetWidth
                    onClickOutside={() => setAddButtonOpen(false)}
                >
                    <List hasBorder>
                        <For
                            each={missingComponents()}
                            fallback={<ListEmptyContent>No more components</ListEmptyContent>}
                        >
                            {(missing) => {
                                return (
                                    <ListItem
                                        onClick={() => {
                                            props.onUpdate(missing.initial);
                                        }}
                                    >
                                        <span
                                            class={styles.addListItemIcon}
                                            classList={{ [missing.cls ?? '']: Boolean(missing.cls) }}
                                        >
                                            {missing.icon}
                                        </span>
                                        {missing.name}
                                    </ListItem>
                                );
                            }}
                        </For>
                    </List>
                </Floater>
            </Show>

            <Header padded>
                <Heading size="sm" withMargin>
                    Characteristics
                </Heading>
            </Header>
            <ConfiguratorTotals config={props.value} />
        </div>
    );
};
