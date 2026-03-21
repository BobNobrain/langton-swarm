import type { BlueprintController, BlueprintDeck, BlueprintId } from './deck';
import type { GameSwarms, SwarmUnitId } from './swarms';
import type { NodeId } from './types';

export function rGetUnitIdsByBlueprint({
    id: blueprintId,
    version,
    swarms,
}: {
    id: BlueprintId;
    version?: number;
    swarms: GameSwarms;
}): SwarmUnitId[] {
    const swarmIds = swarms.findSwarms(blueprintId, version);
    const unitIds: SwarmUnitId[] = [];

    for (const swarmId of swarmIds) {
        const swarm = swarms.getSwarmData(swarmId);
        if (!swarm) {
            continue;
        }

        unitIds.push(...swarm.rUnitIds());
    }

    return unitIds;
}

export function getUnitBlueprint({
    unitId,
    deck,
    swarms,
}: {
    unitId: SwarmUnitId;
    deck: BlueprintDeck;
    swarms: GameSwarms;
}): { blueprint: BlueprintController; version: number } | null {
    const swarm = swarms.getSwarmDataByUnitId(unitId);
    if (!swarm) {
        return null;
    }

    const blueprint = deck.getBlueprint(swarm.blueprintId);
    if (!blueprint) {
        return null;
    }

    return { blueprint, version: swarm.blueprintVersion };
}

export function renderTileId(tid: NodeId | null | undefined) {
    if (typeof tid !== 'number') {
        return '--';
    }

    return '#' + tid.toString(16).padStart(3, '0');
}
