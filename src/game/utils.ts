import type { BlueprintDeck, BlueprintId } from './deck';
import type { createGameSystems } from './systems';
import type { NodeId } from './types';

export function renderTileId(tid: NodeId | null | undefined) {
    if (typeof tid !== 'number') {
        return '--';
    }

    return '#' + tid.toString(16).padStart(3, '0');
}

export function spawnFromDeck(
    deck: BlueprintDeck,
    systems: Pick<ReturnType<typeof createGameSystems>, 'spawn'>,
    at: NodeId,
    bpId: BlueprintId,
    bpVersionNumber?: number,
) {
    const bp = deck.getBlueprint(bpId);
    if (!bp) {
        console.error('[WARN] spawnFromDeck: blueprint not found', bpId);
        return;
    }

    const version =
        bpVersionNumber === undefined || bpVersionNumber < 0 ? bp.rLastVersion() : bp.rVersions()[bpVersionNumber];

    if (!version) {
        console.error('[WARN] spawnFromDeck: blueprint version not found', {
            bpId,
            bpVersion: bpVersionNumber,
            vs: bp.rVersions(),
        });
        return;
    }

    bp.lockVersion(version.version);
    const unitId = systems.spawn({ at, config: version.config });
    bp.registerUnit(unitId, version.version);
}
