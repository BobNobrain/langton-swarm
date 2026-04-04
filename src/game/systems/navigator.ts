import { pick } from '@/lib/random';
import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    callableUnitSystemHandlers,
    returnToCpu,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './utils';

export type NavigatorSystemData = {
    home: NodeId;
    currentRoute: NodeId[];
};

type NavigatorDeps = Pick<GameWorld, 'surface' | 'nav'>;

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
    find_route: {
        description:
            'Finds a route to specified location. Call navigator.next_step and navigator.has_next to use the found route',
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, _, { nav }) {
            const to = extractTyped(args, 'to', 'position')!.value;
            const route = nav.findPath(ctx.state.location, to) as NodeId[];

            returnToCpu(ctx, { type: 'flag', value: route.length > 0 });
            if (!route.length) {
                return false;
            }

            const map = ctx.systemData;
            map.currentRoute = route.slice(1);

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
};

export function createNavigatorSystem(options: CreateUnitSystemCommonOptions, deps: NavigatorDeps) {
    return createUnitSystem<NavigatorSystemData, CallableUnitSystemMessages>(options, {
        name: NAVIGATOR_SYSTEM_NAME,
        messages: {
            ...callableUnitSystemHandlers(deps, NAVIGATOR_FNS),
        },

        initialData: (config, state) => {
            if (!config.navigator) {
                return null;
            }

            return {
                home: state.location,
                currentRoute: [],
            };
        },
    });
}
