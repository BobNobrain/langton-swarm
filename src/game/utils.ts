import type { BlueprintDeck, BlueprintId } from './deck';
import type { createGameSystems } from './systems';
import type { SpawnFn } from './systems/types';
import type { NodeId, UnitId } from './types';

export function renderTileId(tid: NodeId | null | undefined) {
    if (typeof tid !== 'number') {
        return '--';
    }

    return '#' + tid.toString(16).padStart(3, '0');
}

export function renderHealth(h: number | null | undefined): string {
    if (typeof h !== 'number') {
        return 'H--%';
    }

    if (h <= 0) {
        return 'DEAD';
    }

    const percents = Math.round(Math.min(h * 100, 100));

    if (percents === 100) {
        return 'H100';
    }

    return `H${percents}%`;
}

export function renderEnergy(e: number | null | undefined): string {
    if (typeof e !== 'number') {
        return 'E--%';
    }

    if (e <= 0) {
        return 'E00!';
    }

    const percents = Math.round(Math.min(e * 100, 100));

    if (percents === 100) {
        return 'EFUL';
    }

    return `E${percents}%`;
}

export function spawnFromDeck(
    deck: BlueprintDeck,
    spawn: SpawnFn,
    at: NodeId,
    bpId: BlueprintId,
    bpVersionNumber?: number,
): UnitId | null {
    const bp = deck.getBlueprint(bpId);
    if (!bp) {
        console.error('[WARN] spawnFromDeck: blueprint not found', bpId);
        return null;
    }

    const version =
        bpVersionNumber === undefined || bpVersionNumber < 0 ? bp.rLastVersion() : bp.rVersions()[bpVersionNumber];

    if (!version) {
        console.error('[WARN] spawnFromDeck: blueprint version not found', {
            bpId,
            bpVersion: bpVersionNumber,
            vs: bp.rVersions(),
        });
        return null;
    }

    bp.lockVersion(version.version);
    const unitId = spawn({ at, config: version.config, faction: deck.owner });
    bp.registerUnit(unitId, version.version);
    return unitId;
}
