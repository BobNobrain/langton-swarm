import { createMemo, Show, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Button } from '@/components/Button/Button';
import { InventoryContent } from '@/components/Inventory/Inventory';
import { TimeLabel } from '@/components/TimeLabel/TimeLabel';
import type { UnitConfiguration } from '@/game';
import { getConstructionCosts, getConstructionPoints } from '@/game/config';
import type { UnitComponent } from './types';
import styles from '../Configurator.module.css';

export const UnitComponentWrapper: Component<{
    config: UnitConfiguration;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
    component: UnitComponent;
    readonly: boolean | undefined;
}> = (props) => {
    const fieldClassList = createMemo(() => {
        const tier = props.component.getTier?.(props.config) ?? 0;
        return {
            [styles.tier0]: tier === 0,
            [styles.tier1]: tier === 1,
            [styles.tier2]: tier === 2,
            [props.component.cls ?? '']: Boolean(props.component.cls),
        };
    });

    const isolated = createMemo(() => {
        return props.component.isolate(props.config);
    });

    const isPresent = createMemo(() => {
        const mode = props.component.mode ?? 'default';
        return mode === 'default' ? props.component.isPresent(props.config) : true;
    });

    return (
        <Show when={isPresent()}>
            <div class={styles.field} classList={fieldClassList()}>
                <div class={styles.fieldTop}>
                    <div class={styles.fieldIcon}>{props.component.icon}</div>
                    <div class={styles.fieldName}>{props.component.name}</div>
                    <div class={styles.fieldInput}>
                        <Dynamic
                            component={props.component.inputRenderer}
                            config={props.config}
                            onUpdate={props.onUpdate}
                            readonly={props.readonly ?? false}
                        />
                    </div>
                    <div class={styles.fieldRemove}>
                        <Button
                            style="secondary-danger"
                            disabled={
                                props.component.mode === 'required' ||
                                !props.component.isPresent(props.config) ||
                                props.readonly
                            }
                            onClick={() => props.onUpdate(props.component.remove)}
                        >
                            RM
                        </Button>
                    </div>
                </div>
                <Show when={props.component.isPresent(props.config)}>
                    <div class={styles.fieldValueDescription}>{props.component.description(props.config)}</div>
                    <div class={styles.fieldCosts}>
                        <div class={styles.fieldTierBadge}></div>
                        <div class={styles.timeCost}>
                            <TimeLabel
                                title="Construction time on a tier 1 assembler"
                                ticks={getConstructionPoints(isolated())}
                            />
                        </div>
                        <InventoryContent contents={getConstructionCosts(isolated())} concise empty="--" />
                    </div>
                </Show>
                <Show when={props.component.warningsRenderer}>
                    <div class={styles.fieldWarningsList}>
                        <Dynamic
                            component={props.component.warningsRenderer}
                            config={props.config}
                            onUpdate={props.onUpdate}
                            readonly={props.readonly ?? false}
                        />
                    </div>
                </Show>
            </div>
        </Show>
    );
};
