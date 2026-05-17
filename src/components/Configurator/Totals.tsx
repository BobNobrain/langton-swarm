import { Show, type Component } from 'solid-js';
import type { UnitConfiguration } from '@/game';
import {
    AssemblerConfiguration,
    getBatteryCapacity,
    getConstructionCosts,
    getConstructionTimeTicks,
    getDrillProperties,
    getEnergyPerMove,
    getMaxSolarPower,
    getStorageCapacity,
    getTicksPerMove,
    getUnitMass,
} from '@/game/config';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { Badge } from '../Badge/Badge';
import { DefList, DefListItem } from '../DefList/DefList';
import { InventoryContent } from '../Inventory/Inventory';
import { TimeLabel } from '../TimeLabel/TimeLabel';
import styles from './Configurator.module.css';
import { formatInteger } from '@/lib/strings';

export const ConfiguratorTotals: Component<{
    config: UnitConfiguration;
}> = (props) => {
    const { world } = useGame();

    return (
        <DefList>
            <DefListItem name="Materials">
                <InventoryContent contents={getConstructionCosts(props.config)} concise />
            </DefListItem>
            <DefListItem name="Assembly">
                <div class={styles.badgeList}>
                    <TimeLabel
                        ticks={getConstructionTimeTicks({
                            target: props.config,
                            assembler: { assembler: AssemblerConfiguration.Tier1 },
                        })}
                        title="Construction time (on tier 1 assembler)"
                    />
                    <span>/</span>
                    <TimeLabel
                        ticks={getConstructionTimeTicks({
                            target: props.config,
                            assembler: { assembler: AssemblerConfiguration.Tier2 },
                        })}
                        title="Construction time (on tier 2 assembler)"
                    />
                </div>
            </DefListItem>
            <DefListItem name="Movement">
                <Show when={props.config.engine} fallback="--">
                    <div class={styles.badgeList}>
                        <TimeLabel ticks={getTicksPerMove(props.config)} title="Time to move 1 step" />
                        <Badge icon="m" title="Unit mass">
                            {formatInteger(getUnitMass(props.config), { digits: 0 })}
                        </Badge>
                        <Badge icon={Symbols.HalfFilledSquareLeft} title="Energy per move">
                            {getEnergyPerMove(props.config)}
                        </Badge>
                    </div>
                </Show>
            </DefListItem>
            <DefListItem name="Energy">
                <div class={styles.badgeList}>
                    <Badge icon={Symbols.HalfFilledSquareLeft} title="Battery capacity">
                        {formatInteger(getBatteryCapacity(props.config), { digits: 0 })}
                    </Badge>
                    <Badge icon={Symbols.SquareGrid} title="Approximate energy gained per day">
                        {formatInteger(estimateSolarInputPerCycle(props.config, world.dayLengthTicks), {
                            explicitPlusSign: true,
                            digits: 0,
                        })}
                    </Badge>
                </div>
            </DefListItem>
            <DefListItem name="Storage">
                <div class={styles.badgeList}>
                    <Badge icon={Symbols.ParallelogramOutline} title="Storage capacity">
                        {formatInteger(getStorageCapacity(props.config), { digits: 0 })}
                    </Badge>
                    <Show when={props.config.drill}>
                        <TimeLabel ticks={getTimeToFill(props.config)} title="Time to fill" />
                    </Show>
                </div>
            </DefListItem>
        </DefList>
    );
};

function estimateSolarInputPerCycle(config: UnitConfiguration | null, dayLengthTicks: number) {
    if (!config) {
        return 0;
    }

    const maxOutput = getMaxSolarPower(config);
    const overDay = maxOutput * dayLengthTicks;
    return overDay;
}

function getTimeToFill(config: UnitConfiguration | null) {
    if (!config) {
        return 0;
    }

    const { miningAmount, miningTime } = getDrillProperties(config);
    const cap = getStorageCapacity(config);
    const itemsPerTick = miningAmount / miningTime;
    const timeToFill = cap / itemsPerTick;
    return Math.round(timeToFill);
}
