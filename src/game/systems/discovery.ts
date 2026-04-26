import { getDiscoveryRange, isStationary } from '../config';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type DiscoverySystemData = {
    range: number;
    lastPosition: number;
};

export function createDiscoverySystem(
    opts: CreateUnitSystemCommonOptions,
    world: GameWorld,
    positions: PositionalSystemController,
) {
    return createUnitSystem<DiscoverySystemData, {}>(opts, {
        name: 'discovery',

        initialData({ config, at }) {
            // TODO: check "faction"

            const range = getDiscoveryRange(config);
            discover(world, at, range);

            if (isStationary(config)) {
                return null;
            }

            return { range, lastPosition: -1 };
        },

        // TODO: events-based discovery?
        tick(ctx, env) {
            const discovery = ctx.systemData;
            const pos = positions.getEffectivePosition(ctx.unitId);

            if (pos === discovery.lastPosition) {
                return;
            }

            discover(world, pos, discovery.range);
            discovery.lastPosition = pos;
        },
    });
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
