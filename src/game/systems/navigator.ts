import { pick } from '@/lib/random';
import { extractTyped } from '../program/utils';
import type { NodeId } from '../types';
import {
    callableUnitSystemHandlers,
    createUnitSystem,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
    type CreateUnitSystemCommonOptions,
} from './systems';
import { returnToCpu } from './utils';

type NavigatorData = {
    currentRoute: NodeId[];
    currentRouteIndex: number;
    ticksPerMove: number;
};

export const NAVIGATOR_FNS: CallableUnitSystemFunctions<NavigatorData> = {
    navigate: {
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, env) {
            const currentPosition = ctx.state.location;
            const to = extractTyped(args, 'to', 'position', {
                zero: { type: 'position', value: currentPosition },
                random: {
                    type: 'position',
                    // TODO: make random mean any tile, not just neighbour?
                    value: pick(Math.random, Array.from(env.world.nodes[currentPosition].connections.values())),
                },
            })!;

            const path = env.world.nav.findPath(ctx.state.location, to.value) as NodeId[];
            ctx.systemData.currentRoute = path;
            ctx.systemData.currentRouteIndex = 0;
            return true;
        },
    },
    move: {
        argNames: ['to'],
        argTypes: ['position'],
        returnType: 'flag',
        init(args, ctx, env) {
            const currentPosition = ctx.state.location;
            const to = extractTyped(args, 'to', 'position', {
                zero: { type: 'position', value: currentPosition },
                random: {
                    type: 'position',
                    value: pick(Math.random, Array.from(env.world.nodes[currentPosition].connections.values())),
                },
            })!;

            const isNbor = env.world.nodes[ctx.state.location].connections.has(to.value);
            const nav = ctx.systemData;

            if (!isNbor) {
                nav.currentRoute.length = 0;
                nav.currentRouteIndex = 0;
                returnToCpu(ctx, { type: 'flag', value: false });
                return false;
            }

            ctx.systemData.currentRoute = [ctx.state.location, to.value];
            ctx.systemData.currentRouteIndex = 0;
            return true;
        },
    },
};

export function createNavigatorSystem(options: CreateUnitSystemCommonOptions) {
    const system = createUnitSystem<NavigatorData, CallableUnitSystemMessages>(options, {
        name: 'navigator',
        messages: {
            ...callableUnitSystemHandlers(NAVIGATOR_FNS),
        },

        initialData: (config, state) => {
            if (!config.navigator) {
                return null;
            }

            return {
                currentRoute: [],
                currentRouteIndex: -1,
                ticksPerMove: 2, // TODO: use config to determine unit speed
            };
        },

        tick(ctx, env) {
            const nav = ctx.systemData;
            const nextTile = nav.currentRoute[nav.currentRouteIndex];

            if (nextTile === undefined) {
                const success = ctx.state.location === nav.currentRoute[nav.currentRoute.length - 1];
                nav.currentRoute = [];
                nav.currentRouteIndex = -1;
                ctx.sleep();

                returnToCpu(ctx, { type: 'flag', value: success });
                return;
            }

            nav.currentRouteIndex += 1;
            ctx.update({ location: nextTile });
            ctx.sleep(nav.ticksPerMove);
        },
    });

    return system;
}
