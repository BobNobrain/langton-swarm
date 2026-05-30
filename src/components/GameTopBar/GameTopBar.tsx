import { createSignal, For, Show, type Component, type ParentComponent, type Signal } from 'solid-js';
import type { KnownResourceName, UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { createUnitEventAllListener } from '@/hooks/events';
import { onTick } from '@/hooks/onTick';
import { Symbols } from '@/lib/ascii';
import { KeyCode } from '@/lib/input';
import { formatInteger } from '@/lib/strings';
import { BlueprintLabel } from '../BlueprintLabel/BlueprintLabel';
import { Button } from '../Button/Button';
import { RESOURCE_COLORS, RESOURCE_ICONS, RESOURCE_NAMES } from '../Inventory/Inventory';
import { TopBarBadge } from './TopBarBadge';
import styles from './GameTopBar.module.css';
import { Nots } from './Nots';
import { GameMenu } from './GameMenu';

export const GameTopBar: Component = () => {
    const { time, units, factions, gameTick } = useGame();

    const allUnits = units.factions.getAllUnits(factions.player.id);
    const [totalUnits, setTotalUnits] = createSignal(allUnits.size);

    createUnitEventAllListener({
        ev: units.spawned,
        listener(ev) {
            if (ev.payload.faction === factions.player.id) {
                setTotalUnits(allUnits.size);
            }
        },
    });
    createUnitEventAllListener({
        ev: units.despawned,
        listener(ev) {
            setTotalUnits(allUnits.size);
        },
    });

    const inventory = trackTotalInventory(allUnits);

    const [gameTime, setGameTime] = createSignal('00:00');
    onTick((tick) => {
        const ms = tick * gameTick.tickDurationMs;
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60_000);
        setGameTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    });

    return (
        <div class={styles.topBar} classList={{ [styles.paused]: time.rIsPaused() }}>
            <TopBarBadge
                icon={Symbols.DiamondOutlined}
                text={formatInteger(totalUnits())}
                title={`Total units: ${totalUnits()}`}
            />
            <Nots padRight />
            <For each={Object.keys(inventory.totals) as Array<KnownResourceName>}>
                {(resource) => {
                    const rAmount = inventory.totals[resource];

                    return (
                        <TopBarBadge
                            icon={RESOURCE_ICONS[resource]}
                            text={formatInteger(rAmount())}
                            title={`${RESOURCE_NAMES[resource]}: ${rAmount()}`}
                            color={RESOURCE_COLORS[resource]}
                        />
                    );
                }}
            </For>
            <div class={styles.spacer}></div>
            <TopBarBadge icon={Symbols.CircleQuarterTopRight} text={gameTime()} title="Game time" />
            <Button style="text" disabled={!time.rIsPaused()} onClick={time.advanceOneTick}>
                Step
            </Button>
            <Button
                style="primary"
                hotkey={{ key: KeyCode.Space }}
                hotkeyPosition="none"
                disabled={time.rIsPaused()}
                onClick={time.togglePause}
            >
                ▌▐
            </Button>
            <Button
                style="primary"
                hotkey={{ key: KeyCode.Space }}
                hotkeyPosition="none"
                disabled={!time.rIsPaused()}
                onClick={time.togglePause}
            >
                ▶
            </Button>
            <Button
                style="primary"
                // onClick={time.togglePause}
            >
                ▶▶
            </Button>
            <GameMenu />

            <Show when={time.rIsPaused()}>
                <div class={styles.pausedBanner}>Game Is Paused</div>
            </Show>
        </div>
    );
};

function trackTotalInventory(unitIds: Set<UnitId>) {
    const { units } = useGame();

    const signals: Record<KnownResourceName, Signal<number>> = {
        electrical: createSignal(0),
        structural: createSignal(0),
        energetical: createSignal(0),
        combat: createSignal(0),
        special: createSignal(0),
    };

    const totals: Record<KnownResourceName, () => number> = {
        electrical: signals.electrical[0],
        structural: signals.structural[0],
        energetical: signals.energetical[0],
        combat: signals.combat[0],
        special: signals.special[0],
    };

    const update = () => {
        const sum: Record<string, number> = {};

        for (const unitId of unitIds) {
            const inv = units.inventory.getInfo(unitId);
            if (!inv) {
                continue;
            }

            for (const resource of Object.keys(inv.contents)) {
                sum[resource] ??= 0;
                sum[resource] += inv.contents[resource];
            }
        }

        signals.electrical[1](sum['electrical'] ?? 0);
        signals.structural[1](sum['structural'] ?? 0);
        signals.energetical[1](sum['energetical'] ?? 0);
        signals.combat[1](sum['combat'] ?? 0);
        signals.special[1](sum['special'] ?? 0);
    };

    update();

    createUnitEventAllListener({
        ev: units.inventory.updated,
        listener(ev) {
            if (!unitIds.has(ev.unitId)) {
                return;
            }

            update();
        },
    });

    return { totals };
}
