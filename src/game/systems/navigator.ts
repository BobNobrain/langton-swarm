import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import {
    usfSleep,
    usfHandlers,
    typedUSF,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './func';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import { bfsSleepTime } from './utils';

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
        *body(_, ctx) {
            return { type: 'position', value: ctx.systemData.home };
        },
    },
    location: {
        description: 'Returns current location of the unit',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx, { positions }) {
            return { type: 'position', value: positions.getEffectivePosition(ctx.unitId) };
        },
    },

    find_route: typedUSF({
        description:
            'Finds a route to specified location. Call navigator.next_step and navigator.has_next to use the found route',
        args: { to: 'position' },
        returnType: 'flag',
        *body(args, ctx, { world: { nav }, positions }) {
            const to = args.to.value;
            const route = nav.findPath(positions.getEffectivePosition(ctx.unitId), to) as NodeId[];

            if (route.length) {
                const map = ctx.systemData;
                map.currentRoute = route.slice(1);
            }

            return { type: 'flag', value: route.length > 0 };
        },
    }),
    make_circle_route: {
        description:
            'Builds a route that circles around current position once. Call navigator.next_step and navigator.has_next to use the found route',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx, { positions, world }) {
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

            return { type: 'flag', value: navigator.currentRoute.length > 0 };
        },
    },

    closest_unknown: {
        description: 'Returns the location of the closest unknown (i.e. never seen) tile',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx, { positions, world }) {
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

            yield usfSleep(bfsSleepTime(bfs.getVisited()));
            return { type: 'position', value: result };
        },
    },

    next_step: {
        description: 'Retrieves the next position of the route found with navigator.find_route(to)',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx) {
            const map = ctx.systemData;
            const result = map.currentRoute[0];
            map.currentRoute.shift();
            return { type: 'position', value: result };
        },
    },
    has_next: {
        description:
            "Allows to check whether the route found with navigator.find_route(to) still hasn't been completed",
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        *body(_, ctx) {
            return { type: 'flag', value: ctx.systemData.currentRoute.length > 0 };
        },
    },
    route_length: {
        description: 'Returns the length of current route',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx) {
            return { type: 'number', value: ctx.systemData.currentRoute.length };
        },
    },

    away_from: typedUSF({
        description: 'Returns a nearby position that is directed away from some source position',
        args: { source: 'position' },
        returnType: 'position',
        *body(args, ctx, { world, positions }) {
            const source = args.source.value;
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (source) {
                const nbors = world.nav.getNeighbours(source) as NodeId[];
                const path = world.nav.findPath(current, source);

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

            return { type: 'position', value: result ?? current };
        },
    }),
    towards: typedUSF({
        description: 'Returns a nearby position that will move you closer to given destination',
        args: { destination: 'position' },
        returnType: 'position',
        *body(args, ctx, { world, positions }) {
            const destination = args.destination.value;
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (destination) {
                const path = world.nav.findPath(current, destination);

                if (path.length >= 2) {
                    result = path[1] as NodeId;
                }
            }

            return { type: 'position', value: result ?? current };
        },
    }),
    random: {
        description: 'Returns a random nearby position that you can move towards',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx, { world, positions }) {
            const current = positions.getEffectivePosition(ctx.unitId);
            const nbors = world.nav.getNeighbours(current) as NodeId[];
            const result = nbors.length ? nbors[Math.floor(Math.random() * nbors.length)] : current;
            return { type: 'position', value: result };
        },
    },
};

export function createNavigatorSystem(options: CreateUnitSystemCommonOptions, deps: NavigatorDeps) {
    return createUnitSystem<NavigatorSystemData, CallableUnitSystemMessages>(options, {
        name: NAVIGATOR_SYSTEM_NAME,
        messages: {
            ...usfHandlers(NAVIGATOR_FNS, deps),
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
