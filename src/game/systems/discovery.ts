import { getDiscoveryRange, isStationary } from '../config';
import type { GameFactions } from '../factions';
import type { NodeId, UnitId } from '../types';
import type { GameWorld } from '../world';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { UnitSystem, type UnitSystemTickContext } from './UnitSystem';

type DiscoverySystemData = {
    range: number;
    lastPosition: number;
};

export class DiscoverySystem extends UnitSystem<DiscoverySystemData> {
    constructor(
        opts: UnitSystemOrchestrator,
        private world: GameWorld,
        private positions: PositionalSystemController,
        private factions: GameFactions,
    ) {
        super('discovery', opts);
    }

    protected initialData({ config, at, faction }: SpawnOptions, unitId: UnitId): DiscoverySystemData | null {
        if (this.factions.getFaction(faction)?.isAI ?? true) {
            // discovery only works for the player
            // TODO: do something for multiplayer?
            return null;
        }

        const range = getDiscoveryRange(config);
        discover(this.world, at, range);

        if (isStationary(config)) {
            // no need to constantly check positions for a stationary unit
            return null;
        }

        return { range, lastPosition: -1 };
    }

    protected onTick(ctx: UnitSystemTickContext<DiscoverySystemData>): void {
        const discovery = ctx.systemData;
        const pos = this.positions.getEffectivePosition(ctx.unitId);

        if (pos === discovery.lastPosition) {
            return;
        }

        discover(this.world, pos, discovery.range);
        discovery.lastPosition = pos;
    }
}

function discover(world: GameWorld, loc: NodeId, radius: number) {
    const circle = new Set<NodeId>();

    world.graph.bfs(loc, (tid, depth) => {
        if (depth >= radius) {
            return true;
        }

        circle.add(tid as NodeId);
    });

    world.discoverNodes(circle);
}
