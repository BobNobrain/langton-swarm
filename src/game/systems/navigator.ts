import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    bfsSleepTime,
    callableUnitSystemHandlers,
    returnToCpu,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './utils';

export type NavigatorSystemData = {
    home: NodeId;
    currentRoute: NodeId[];
};

type NavigatorDeps = {
    world: Pick<GameWorld, 'surface' | 'nav' | 'terraIncognita'>;
    positions: PositionalSystemController;
};

export const NAVIGATOR_SYSTEM_NAME = 'navigator';

export const NAVIGATOR_FNS: CallableUnitSystemFunctions<NavigatorSystemData, NavigatorDeps> = {
    home: {
        description: 'Returns the spawn location of this unit',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(_, ctx) {
            returnToCpu(ctx, { type: 'position', value: ctx.systemData.home });
            return false;
        },
    },
    location: {
        description: 'Returns current location of the unit',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(_args, ctx, _env, { positions }) {
            returnToCpu(ctx, { type: 'position', value: positions.getEffectivePosition(ctx.unitId) });
            return false;
        },
    },

    find_route: {
        description:
            'Finds a route to specified location. Call navigator.next_step and navigator.has_next to use the found route',
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { world: { nav }, positions }) {
            const to = extractTyped(args, 'to', 'position')!.value;
            const route = nav.findPath(positions.getEffectivePosition(ctx.unitId), to) as NodeId[];

            returnToCpu(ctx, { type: 'flag', value: route.length > 0 });
            if (!route.length) {
                return false;
            }

            const map = ctx.systemData;
            map.currentRoute = route.slice(1);

            return false;
        },
    },
    make_circle_route: {
        description:
            'Builds a route that circles around current position once. Call navigator.next_step and navigator.has_next to use the found route',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { positions, world }) {
            const current = positions.getEffectivePosition(ctx.unitId);
            const unvisitedNbors = (world.nav.getNeighbours(current) as NodeId[]).slice();
            const navigator = ctx.systemData;

            if (unvisitedNbors.length) {
                navigator.currentRoute.length = 0;
                navigator.currentRoute.push(unvisitedNbors.pop()!);

                while (unvisitedNbors.length) {
                    const last = navigator.currentRoute[navigator.currentRoute.length - 1];
                    let found = false;

                    for (let i = 0; i < unvisitedNbors.length; i++) {
                        const nbor = unvisitedNbors[i];

                        if (!world.nav.getNeighbours(nbor).includes(last)) {
                            continue;
                        }

                        found = true;
                        navigator.currentRoute.push(nbor);
                        unvisitedNbors.splice(i, 1);
                        break;
                    }

                    if (!found) {
                        break;
                    }
                }
            }

            returnToCpu(ctx, { type: 'flag', value: navigator.currentRoute.length > 0 });
            return false;
        },
    },

    closest_unknown: {
        description: 'Returns the location of the closest unknown (i.e. never seen) tile',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(_, ctx, _env, { positions, world }) {
            const location = positions.getEffectivePosition(ctx.unitId);
            const bfs = world.nav.bfs(location);
            let result = location;

            while (!bfs.isDone()) {
                const next = bfs.nextNodeToVisit().node;
                if (world.terraIncognita.has(next)) {
                    result = next;
                    break;
                }

                bfs.expand();
            }

            returnToCpu(ctx, { type: 'position', value: result }, bfsSleepTime(bfs.getVisited()));
            return false;
        },
    },

    next_step: {
        description: 'Retrieves the next position of the route found with navigator.find_route(to)',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(_, ctx) {
            const map = ctx.systemData;
            returnToCpu(ctx, { type: 'position', value: map.currentRoute[0] });
            map.currentRoute.shift();
            return false;
        },
    },
    has_next: {
        description:
            "Allows to check whether the route found with navigator.find_route(to) still hasn't been completed",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_, ctx) {
            returnToCpu(ctx, { type: 'flag', value: ctx.systemData.currentRoute.length > 0 });
            return false;
        },
    },
    route_length: {
        description: 'Returns the length of current route',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        init(_, ctx) {
            returnToCpu(ctx, { type: 'number', value: ctx.systemData.currentRoute.length });
            return false;
        },
    },

    away_from: {
        description: 'Returns a nearby position that is directed away from some source position',
        argNames: ['source'],
        argTypes: ['position'],
        returnType: 'position',
        init(args, ctx, env, { world, positions }) {
            const source = extractTyped(args, 'source', 'position');
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (source) {
                const nbors = world.nav.getNeighbours(source.value) as NodeId[];
                const path = world.nav.findPath(current, source.value);

                if (path.length >= 2) {
                    const towards = path[1] as NodeId;
                    const coords = world.surface[towards].position;
                    let maxD2 = 0;
                    let farthestNbor = towards;

                    for (const nbor of nbors) {
                        if (nbor === towards) {
                            continue;
                        }

                        const d2 = coords.clone().sub(world.surface[nbor].position).lengthSq();
                        if (d2 > maxD2) {
                            maxD2 = d2;
                            farthestNbor = nbor;
                        }
                    }

                    if (farthestNbor !== towards) {
                        result = farthestNbor;
                    }
                }
            }

            returnToCpu(ctx, { type: 'position', value: result ?? current });
            return false;
        },
    },
    towards: {
        description: 'Returns a nearby position that will move you closer to given destination',
        argNames: ['destination'],
        argTypes: ['position'],
        returnType: 'position',
        init(args, ctx, env, { world, positions }) {
            const destination = extractTyped(args, 'destination', 'position');
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (destination) {
                const path = world.nav.findPath(current, destination.value);

                if (path.length >= 2) {
                    result = path[1] as NodeId;
                }
            }

            returnToCpu(ctx, { type: 'position', value: result ?? current });
            return false;
        },
    },
    random: {
        description: 'Returns a random nearby position that you can move towards',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(args, ctx, env, { world, positions }) {
            const current = positions.getEffectivePosition(ctx.unitId);
            const nbors = world.nav.getNeighbours(current) as NodeId[];
            const result = nbors.length ? nbors[Math.floor(Math.random() * nbors.length)] : current;
            returnToCpu(ctx, { type: 'position', value: result });
            return false;
        },
    },
};

export function createNavigatorSystem(options: CreateUnitSystemCommonOptions, deps: NavigatorDeps) {
    return createUnitSystem<NavigatorSystemData, CallableUnitSystemMessages>(options, {
        name: NAVIGATOR_SYSTEM_NAME,
        messages: {
            ...callableUnitSystemHandlers(deps, NAVIGATOR_FNS),
        },

        initialData: ({ config, at }) => {
            if (!config.navigator) {
                return null;
            }

            return {
                home: at,
                currentRoute: [],
            };
        },
    });
}
