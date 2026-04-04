import { extractTyped } from '../program/utils';
import type { NodeId, ResourceDeposit, SurfaceNode } from '../types';
import type { GameWorld } from '../world';
import type { InventoryController } from './inventory';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    callableUnitSystemHandlers,
    returnToCpu,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './utils';

type ScannerDeps = {
    world: Pick<GameWorld, 'resources' | 'mineResource' | 'surface'>;
    inventory: InventoryController;
};

export type ScannerData = {
    maxRadius: number;
    found: {
        resource: string;
        amount: number;
        location: NodeId;
        distance: number;
    } | null;
};

export const SCANNER_SYSTEM_NAME = 'scanner';

export const SCANNER_FNS: CallableUnitSystemFunctions<ScannerData, ScannerDeps> = {
    find_largest_deposit: {
        description: 'Finds the largest resource deposit in specified radius',
        argNames: ['distance'],
        argTypes: ['number'],
        returnType: 'flag',
        init(args, ctx, _, { world }) {
            const scanner = ctx.systemData;
            const radius = extractTyped(args, 'distance', 'number')!;

            scan(
                ctx.state.location,
                Math.min(radius.value, scanner.maxRadius),
                world.surface,
                world.resources,
                (dep, loc, d) => {
                    if (!scanner.found || scanner.found.amount < dep.amount) {
                        scanner.found = { resource: dep.resource, amount: dep.amount, location: loc, distance: d };
                    }

                    return true;
                },
            );

            returnToCpu(
                ctx,
                { type: 'flag', value: Boolean(ctx.systemData.found) },
                scanner.found ? scanner.found.distance * 2 : undefined,
            );
            return false;
        },
    },

    find_closest_deposit: {
        description: 'Finds the closest resource deposit',
        argNames: [],
        argTypes: [],
        returnType: 'flag',
        init(_args, ctx, _env, { world }) {
            const scanner = ctx.systemData;

            scan(ctx.state.location, scanner.maxRadius, world.surface, world.resources, (dep, loc, d) => {
                scanner.found = { resource: dep.resource, amount: dep.amount, location: loc, distance: d };
                return false;
            });

            returnToCpu(
                ctx,
                { type: 'flag', value: Boolean(ctx.systemData.found) },
                scanner.found ? scanner.found.distance * 2 : undefined,
            );
            return false;
        },
    },

    found_location: {
        description:
            'Allows to retrieve the location of a resource deposit that has been previously found with scanner.find_closest_deposit or scanner.find_largest_deposit(radius)',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        init(_, ctx) {
            returnToCpu(ctx, { type: 'position', value: ctx.systemData.found?.location ?? ctx.state.location });
            return false;
        },
    },
};

export function createScannerSystem(
    opts: CreateUnitSystemCommonOptions,
    world: ScannerDeps['world'],
    inventory: InventoryController,
) {
    return createUnitSystem<ScannerData, CallableUnitSystemMessages>(opts, {
        name: SCANNER_SYSTEM_NAME,
        initialData(config, state, unitId) {
            if (!config.scanner) {
                return null;
            }

            return { found: null, maxRadius: 3 };
        },

        messages: {
            ...callableUnitSystemHandlers<ScannerData, ScannerDeps>({ world, inventory }, SCANNER_FNS),
        },
    });
}

function scan(
    start: NodeId,
    maxDistance: number,
    surface: SurfaceNode[],
    resources: Map<NodeId, ResourceDeposit>,
    fn: (dep: ResourceDeposit, loc: NodeId, distance: number) => boolean,
) {
    const visited = new Set<NodeId>();
    const queue = [{ node: start, distance: 0 }];

    while (queue.length) {
        const next = queue.shift()!;
        visited.add(next.node);

        const dep = resources.get(next.node);
        if (dep) {
            const shouldContinue = fn(dep, next.node, next.distance);
            if (!shouldContinue) {
                return;
            }
        }

        if (next.distance >= maxDistance) {
            continue;
        }

        const nbors = surface[next.node].connections;

        for (const nbor of nbors) {
            if (visited.has(nbor)) {
                continue;
            }

            queue.push({ node: nbor, distance: next.distance + 1 });
        }
    }
}
