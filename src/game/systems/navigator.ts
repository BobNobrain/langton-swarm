import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { fnReturn, UnitSystem } from './UnitSystem';
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

export const NAVIGATOR_FNS = {
    home: UnitSystem.declareFn({
        name: 'home',
        args: {},
        returnType: 'position',
        description: 'Returns the spawn location of this unit',
    }),
    location: UnitSystem.declareFn({
        name: 'location',
        args: {},
        returnType: 'position',
        description: 'Returns current location of the unit',
    }),

    find_route: UnitSystem.declareFn({
        name: 'find_route',
        args: { to: 'position' },
        returnType: 'flag',
        description:
            'Finds a route to specified location. Call navigator.next_step and navigator.has_next to use the found route',
    }),
    make_circle_route: UnitSystem.declareFn({
        name: 'make_circle_route',
        args: {},
        returnType: 'flag',
        description:
            'Builds a route that circles around current position once. Call navigator.next_step and navigator.has_next to use the found route',
    }),

    closest_unknown: UnitSystem.declareFn({
        name: 'closest_unknown',
        args: {},
        returnType: 'position',
        description: 'Returns the location of the closest unknown (i.e. never seen) tile',
    }),

    next_step: UnitSystem.declareFn({
        name: 'next_step',
        args: {},
        returnType: 'position',
        description: 'Retrieves the next position of the route found with navigator.find_route(to)',
    }),
    has_next: UnitSystem.declareFn({
        name: 'has_next',
        args: {},
        returnType: 'flag',
        description:
            "Allows to check whether the route found with navigator.find_route(to) still hasn't been completed",
    }),
    route_length: UnitSystem.declareFn({
        name: 'route_length',
        args: {},
        returnType: 'number',
        description: 'Returns the length of current route',
    }),

    away_from: UnitSystem.declareFn({
        name: 'away_from',
        args: { source: 'position' },
        returnType: 'position',
        description: 'Returns a nearby position that is directed away from some source position',
    }),
    towards: UnitSystem.declareFn({
        name: 'towards',
        args: { destination: 'position' },
        returnType: 'position',
        description: 'Returns a nearby position that will move you closer to given destination',
    }),
    random: UnitSystem.declareFn({
        name: 'random',
        args: {},
        returnType: 'position',
        description: 'Returns a random nearby position that you can move towards',
    }),
} as const;

export class NavigatorSystem extends UnitSystem<NavigatorSystemData> {
    constructor(opts: UnitSystemOrchestrator, { positions, world: { nav, terraIncognita, surface } }: NavigatorDeps) {
        super(NAVIGATOR_SYSTEM_NAME, opts);

        this.registerFn(NAVIGATOR_FNS.home).implement((_, ctx) =>
            fnReturn({ type: 'position', value: ctx.systemData.home }),
        );

        this.registerFn(NAVIGATOR_FNS.location).implement((_, ctx) =>
            fnReturn({ type: 'position', value: positions.getEffectivePosition(ctx.unitId) }),
        );

        this.registerFn(NAVIGATOR_FNS.find_route).implement(({ args }, ctx) => {
            const to = args.to.value;
            const route = nav.findPath(positions.getEffectivePosition(ctx.unitId), to) as NodeId[];

            if (route.length) {
                const map = ctx.systemData;
                map.currentRoute = route.slice(1);
            }

            return fnReturn({ type: 'flag', value: route.length > 0 });
        });

        this.registerFn(NAVIGATOR_FNS.make_circle_route).implement((_, ctx) => {
            const current = positions.getEffectivePosition(ctx.unitId);
            const unvisitedNbors = (nav.getNeighbours(current) as NodeId[]).slice();
            const navigator = ctx.systemData;

            if (unvisitedNbors.length) {
                navigator.currentRoute.length = 0;
                navigator.currentRoute.push(unvisitedNbors.pop()!);

                while (unvisitedNbors.length) {
                    const last = navigator.currentRoute[navigator.currentRoute.length - 1];
                    let found = false;

                    for (let i = 0; i < unvisitedNbors.length; i++) {
                        const nbor = unvisitedNbors[i];

                        if (!nav.getNeighbours(nbor).includes(last)) {
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

            return fnReturn({ type: 'flag', value: navigator.currentRoute.length > 0 });
        });

        this.registerFn(NAVIGATOR_FNS.closest_unknown).implement((_, ctx) => {
            const location = positions.getEffectivePosition(ctx.unitId);
            const bfs = nav.bfs(location);
            let result = location;

            while (!bfs.isDone()) {
                const next = bfs.nextNodeToVisit().node;
                if (terraIncognita.has(next)) {
                    result = next;
                    break;
                }

                bfs.expand();
            }

            return fnReturn({ type: 'position', value: result }, bfsSleepTime(bfs.getVisited()));
        });

        this.registerFn(NAVIGATOR_FNS.next_step).implement((_, ctx) => {
            const map = ctx.systemData;
            if (!map.currentRoute.length) {
                return fnReturn({ type: 'position', value: positions.getEffectivePosition(ctx.unitId) });
            }

            const result = map.currentRoute[0];
            map.currentRoute.shift();
            return fnReturn({ type: 'position', value: result });
        });

        this.registerFn(NAVIGATOR_FNS.has_next).implement((_, ctx) =>
            fnReturn({ type: 'flag', value: ctx.systemData.currentRoute.length > 0 }),
        );

        this.registerFn(NAVIGATOR_FNS.route_length).implement((_, ctx) =>
            fnReturn({ type: 'number', value: ctx.systemData.currentRoute.length }),
        );

        this.registerFn(NAVIGATOR_FNS.away_from).implement(({ args }, ctx) => {
            const source = args.source.value;
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (source) {
                const nbors = nav.getNeighbours(source) as NodeId[];
                const path = nav.findPath(current, source);

                if (path.length >= 2) {
                    const towards = path[1] as NodeId;
                    const coords = surface[towards].position;
                    let maxD2 = 0;
                    let farthestNbor = towards;

                    for (const nbor of nbors) {
                        if (nbor === towards) {
                            continue;
                        }

                        const d2 = coords.clone().sub(surface[nbor].position).lengthSq();
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

            return fnReturn({ type: 'position', value: result ?? current });
        });

        this.registerFn(NAVIGATOR_FNS.towards).implement(({ args }, ctx) => {
            const destination = args.destination.value;
            const current = positions.getEffectivePosition(ctx.unitId);
            let result: NodeId | null = null;

            if (destination) {
                const path = nav.findPath(current, destination);

                if (path.length >= 2) {
                    result = path[1] as NodeId;
                }
            }

            return fnReturn({ type: 'position', value: result ?? current });
        });

        this.registerFn(NAVIGATOR_FNS.random).implement((_, ctx) => {
            const current = positions.getEffectivePosition(ctx.unitId);
            const nbors = nav.getNeighbours(current) as NodeId[];
            const result = nbors.length ? nbors[Math.floor(Math.random() * nbors.length)] : current;
            return fnReturn({ type: 'position', value: result });
        });
    }

    protected initialData({ config, at }: SpawnOptions): NavigatorSystemData | null {
        if (!config.navigator) {
            return null;
        }

        return {
            home: at,
            currentRoute: [],
        };
    }
}
