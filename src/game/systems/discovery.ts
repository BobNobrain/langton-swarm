import { getDiscoveryRange, isStationary } from '../config';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';

type DiscoverySystemData = {
    range: number;
    lastPosition: number;
};

export function createDiscoverySystem(opts: CreateUnitSystemCommonOptions, world: GameWorld) {
    return createUnitSystem<DiscoverySystemData, {}>(opts, {
        name: 'discovery',

        initialData(config, state, unitId) {
            // TODO: check "faction"

            const range = getDiscoveryRange(config);
            discover(world, state.location, range);

            if (isStationary(config)) {
                return null;
            }

            return { range, lastPosition: -1 };
        },

        tick(ctx, env) {
            const discovery = ctx.systemData;

            if (ctx.state.location === discovery.lastPosition) {
                return;
            }

            discover(world, ctx.state.location, discovery.range);
            discovery.lastPosition = ctx.state.location;
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
