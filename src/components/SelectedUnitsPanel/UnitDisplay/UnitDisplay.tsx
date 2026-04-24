import { createEffect, createMemo, createSignal, For, Show, type Component } from 'solid-js';
import { Button } from '@/components/Button/Button';
import type { UnitId } from '@/game';
import { useGame } from '@/gameContext';
import type { HotkeyDescriptor } from '@/lib/hotkey';
import { KeyCode } from '@/lib/input';
import { AssemblerTabContent } from './AssemblerTabContent/AssemblerTabContent';
import { CpuTabContent, InventoryTabContent, NavigatorTabContent, ScannerTabContent } from './tabs';
import styles from './UnitDisplay.module.css';

type UnitDisplayTab = 'assembler' | 'cpu' | 'inventory' | 'navigator' | 'scanner';

const TAB_NAMES: Record<UnitDisplayTab, string> = {
    assembler: 'Assembler',
    cpu: 'CPU',
    inventory: 'Storage',
    navigator: 'Navigator',
    scanner: 'Scanner',
};

const TAB_HOTKEYS: Record<UnitDisplayTab, HotkeyDescriptor | undefined> = {
    assembler: { key: KeyCode.KeyU },
    cpu: undefined,
    inventory: { key: KeyCode.KeyI },
    navigator: undefined,
    scanner: undefined,
};

export const UnitDisplay: Component<{
    unitId: UnitId | null;
}> = (props) => {
    const { units } = useGame();
    const [selectedTab, setSelectedTab] = createSignal<UnitDisplayTab>('assembler');

    const availableTabs = createMemo(() => {
        const result: UnitDisplayTab[] = [];
        const unitId = props.unitId;
        if (unitId === null) {
            return result;
        }

        if (units.assembler.getData(unitId)) {
            result.push('assembler');
        }

        if (units.inventory.getInfo(unitId)) {
            result.push('inventory');
        }

        if (units.cpu.getData(unitId)) {
            result.push('cpu');
        }

        if (units.navigator.getData(unitId)) {
            result.push('navigator');
        }

        if (units.scanner.getData(unitId)) {
            result.push('scanner');
        }

        return result;
    });

    createEffect(() => {
        const tabs = availableTabs();
        if (!tabs.length) {
            return;
        }

        setSelectedTab((current) => {
            if (tabs.includes('assembler')) {
                return 'assembler';
            }

            if (!tabs.includes(current)) {
                return tabs[0];
            }

            return current;
        });
    });

    return (
        <Show when={props.unitId}>
            <div class={styles.wrapper}>
                <ul class={styles.tabs}>
                    <For each={availableTabs()}>
                        {(tab) => {
                            return (
                                <li class={styles.tab} title={TAB_NAMES[tab]}>
                                    <Button
                                        style={tab === selectedTab() ? 'primary' : 'secondary'}
                                        hotkey={
                                            TAB_HOTKEYS[tab]
                                                ? { ...TAB_HOTKEYS[tab], isEnabled: () => tab !== selectedTab() }
                                                : undefined
                                        }
                                        hotkeyPosition="middle-left"
                                        onClick={() => setSelectedTab(tab)}
                                    >
                                        {TAB_NAMES[tab]}
                                    </Button>
                                </li>
                            );
                        }}
                    </For>
                </ul>
                <div class={styles.content}>
                    <Show when={selectedTab() === 'assembler'}>
                        <AssemblerTabContent unitId={props.unitId} />
                    </Show>
                    <Show when={selectedTab() === 'inventory'}>
                        <InventoryTabContent unitId={props.unitId} />
                    </Show>
                    <Show when={selectedTab() === 'cpu'}>
                        <CpuTabContent unitId={props.unitId} />
                    </Show>
                    <Show when={selectedTab() === 'navigator'}>
                        <NavigatorTabContent unitId={props.unitId} />
                    </Show>
                    <Show when={selectedTab() === 'scanner'}>
                        <ScannerTabContent unitId={props.unitId} />
                    </Show>
                </div>
            </div>
        </Show>
    );
};
