import { createEffect, createMemo, createSignal, onMount, Show, type Component } from 'solid-js';
import type { BlueprintId, InventoryData, UnitId } from '@/game';
import { getConstructionCosts, getConstructionTime, isStationary } from '@/game/config';
import { useGame } from '@/gameContext';
import { KeyCode } from '@/lib/input';
import { Button } from '../Button/Button';
import { FormField } from '../FormField/FormField';
import { Header, Heading } from '../Header/Header';
import { InventoryContent } from '../Inventory/Inventory';
import { NumberInput } from '../NumberInput/NumberInput';
import { createSelectController, Select, type SelectOption } from '../Select/Select';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import styles from './AssemblerMenu.module.css';
import { createTextInputController } from '../TextInput/TextInput';

export const AssemblerMenu: Component<{
    unitId: UnitId | null;
    enabled: boolean;
    unitInventory: InventoryData;
    onClose: () => void;
    onQueue: (blueprintId: BlueprintId, amount: number) => void;
}> = (props) => {
    const { deck, units } = useGame();

    const blueprintOptions = createMemo((): SelectOption<BlueprintId>[] => {
        const result: SelectOption<BlueprintId>[] = [];
        if (!props.unitId) {
            return result;
        }

        const assemblerConfig = units.getConfig(props.unitId);
        if (!assemblerConfig) {
            return result;
        }

        const assemblerIsStationary = isStationary(assemblerConfig);

        for (const bp of deck.rBlueprints()) {
            const targetVersion = bp.rLastVersion();

            if (assemblerIsStationary && isStationary(targetVersion.config)) {
                continue;
            }

            result.push({ text: bp.rName(), value: bp.id });
        }

        return result;
    });

    const [selectedBlueprintId, setSelectedBlueprintId] = createSignal<BlueprintId | null>(
        blueprintOptions()[0]?.value ?? null,
    );
    const [selectedAmount, setSelectedAmount] = createSignal(1);

    createEffect(() => {
        const options = blueprintOptions();
        setSelectedBlueprintId((current) => {
            if (current && options.some((opt) => opt.value === current)) {
                return current;
            }

            return options.length ? options[0].value : null;
        });
    });

    const selectedOption = createMemo(() => {
        const selected = selectedBlueprintId();
        return blueprintOptions().find((option) => option.value === selected) ?? null;
    });

    const selectedSpawnConfig = createMemo(() => {
        const selected = selectedBlueprintId();
        if (!selected) {
            return null;
        }

        const bp = deck.getBlueprint(selected);
        if (!bp) {
            return null;
        }

        const config = bp.rLastVersion().config;
        const amount = selectedAmount();
        return {
            config,
            time: getConstructionTime(config),
            costs: getConstructionCosts(config, amount),
        };
    });

    const pushToQueue = () => {
        const bpId = selectedBlueprintId();
        const amount = selectedAmount();
        if (bpId === null || amount <= 0 || !Number.isInteger(amount) || amount > 1000) {
            return;
        }

        props.onQueue(bpId, amount);
    };

    const blueprintSelect = createSelectController();
    const amountInput = createTextInputController();
    createEffect(() => {
        if (!props.enabled) {
            blueprintSelect.rGet().blur();
            return;
        }

        blueprintSelect.rGet().focus();
    });

    return (
        <div class={styles.spawnPicker}>
            <Header padded>
                <Heading size="sm" withMargin>
                    Spawn
                </Heading>
            </Header>

            <div class={styles.form}>
                <FormField label="Blueprint">
                    <Select
                        controllerRef={blueprintSelect.ref}
                        value={selectedOption()}
                        options={blueprintOptions()}
                        direction="up"
                        popupOpening="manual"
                        sidewaySwitchable
                        onUpdate={(opt) => {
                            setSelectedBlueprintId(opt.value);
                            amountInput.rGet().input?.focus();
                            amountInput.rGet().input?.select();
                        }}
                    />
                </FormField>
                <FormField label="Count">
                    <NumberInput
                        controllerRef={amountInput.ref}
                        value={selectedAmount()}
                        onUpdate={setSelectedAmount}
                        allowsReturnHotkey
                    />
                </FormField>
                <FormField label="Total">
                    <div class={styles.costs}>
                        <Show when={selectedSpawnConfig()}>
                            <TimeLabel ticks={selectedSpawnConfig()?.time ?? null} />
                            <InventoryContent
                                contents={props.unitInventory.contents}
                                costs={selectedSpawnConfig()?.costs ?? {}}
                                concise
                            />
                        </Show>
                    </div>
                </FormField>
            </div>

            <footer class={styles.footer}>
                <Button style="text" hotkey={{ key: KeyCode.Esc }} disabled={!props.enabled} onClick={props.onClose}>
                    Cancel
                </Button>
                <Button
                    style="secondary"
                    hotkey={{ key: KeyCode.Enter, ctrl: true }}
                    disabled={!props.enabled}
                    onClick={pushToQueue}
                >
                    Queue
                </Button>
                <Button
                    style="primary"
                    hotkey={{ key: KeyCode.Enter }}
                    disabled={!props.enabled}
                    onClick={() => {
                        pushToQueue();
                        props.onClose();
                    }}
                >
                    Confirm
                </Button>
            </footer>
        </div>
    );
};
