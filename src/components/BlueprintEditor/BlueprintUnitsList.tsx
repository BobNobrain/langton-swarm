import { createMemo, Show, type Component } from 'solid-js';
import type { BlueprintController, UnitId } from '@/game';
import { useGame } from '@/gameContext';
import { Button } from '../Button/Button';
import { ConfirmationButton } from '../ConfirmationButton/ConfirmationButton';
import { Header, Heading } from '../Header/Header';
import { UnitList } from '../UnitList/UnitList';
import styles from './BlueprintEditor.module.css';

export const BlueprintUnitsList: Component<{
    blueprint: BlueprintController | null;
}> = (props) => {
    const { ui, units } = useGame();

    const selectedVersionNumber = () => {
        return ui.rDeckSelectedVersion() ?? props.blueprint?.rLastVersion().version ?? 0;
    };

    const currentUnitIds = createMemo(() => {
        const bp = props.blueprint;
        if (!bp) {
            return [];
        }

        const v = selectedVersionNumber();
        return bp.rUnitIds()[v] ?? [];
    });

    const obsoleteUnitIds = createMemo(() => {
        const bp = props.blueprint;
        if (!bp) {
            return [];
        }

        const v = selectedVersionNumber();
        const idsByV = bp.rUnitIds();
        const result: UnitId[] = [];

        for (const [vStr, ids] of Object.entries(idsByV)) {
            if (vStr === v.toString()) {
                continue;
            }

            result.push(...ids);
        }

        return result;
    });

    const otherVersionsCount = createMemo(() => {
        return Object.values(props.blueprint?.rVersions() ?? {}).length - 1;
    });

    const upgrade = (ids: UnitId[]) => {
        if (!props.blueprint) {
            return;
        }

        const latest = props.blueprint.upgradeToLatest(ids);
        if (latest.config.program) {
            units.cpu.upgrade(ids, { program: latest.config.program });
        }
    };

    return (
        <>
            <Header padded withMargin actions={<Button>Select {currentUnitIds().length}</Button>}>
                <Heading size="sm" withMargin>
                    v.{selectedVersionNumber().toString()} units
                </Heading>
            </Header>
            <UnitList
                unitIds={currentUnitIds()}
                // onUnitBlueprintVersionClick={(bpId, version) => {}}
                empty={`No units found for v.${selectedVersionNumber().toString()}`}
                unitActions={(data) => (
                    <Button style="text" onClick={() => ui.selectUnits([data.id])}>
                        Sel
                    </Button>
                )}
            />
            <Show when={otherVersionsCount() > 0}>
                <Header
                    padded
                    withMargin
                    actions={
                        <ConfirmationButton
                            style="primary"
                            confirmation={`This action will upgrade ${obsoleteUnitIds().length} units to v.${props.blueprint?.rLastVersion().version ?? 0}`}
                            floaterProps={{ horizontalAnchor: 'right', horizontalDirection: 'left' }}
                            onClick={() => upgrade(obsoleteUnitIds())}
                        >
                            Upgrade all
                        </ConfirmationButton>
                    }
                >
                    <Heading size="sm" withMargin>
                        Other versions {otherVersionsCount()}
                    </Heading>
                </Header>
                <UnitList
                    unitIds={obsoleteUnitIds()}
                    onUnitBlueprintVersionClick={(bpId, version) => {
                        const idsOfClickedVersion = props.blueprint!.rUnitIds()[version];
                        if (!idsOfClickedVersion) {
                            return;
                        }

                        ui.selectUnits(idsOfClickedVersion);
                    }}
                    empty="No units found for other blueprint versions"
                    unitActions={(data) => (
                        <>
                            <Button style="text" onClick={() => ui.selectUnits([data.id])}>
                                sel
                            </Button>
                            <ConfirmationButton
                                confirmation={`This action upgrade selected unit to v.${props.blueprint?.rLastVersion().version}`}
                                floaterProps={{
                                    horizontalAnchor: 'right',
                                    horizontalDirection: 'left',
                                    verticalAnchor: 'top',
                                    verticalDirection: 'up',
                                }}
                                onClick={() => upgrade([data.id])}
                            >
                                Upgrade
                            </ConfirmationButton>
                        </>
                    )}
                />
            </Show>
        </>
    );
};
