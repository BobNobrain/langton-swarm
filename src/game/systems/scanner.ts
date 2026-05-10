import { FactionId } from '../factions';
import { ResourceTier } from '../resources';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import { usfSleep, usfHandlers, type CallableUnitSystemFunctions, type CallableUnitSystemMessages } from './func';
import type { InventoryController } from './inventory';
import type { MarkersSystemController } from './markers';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import { bfsSleepTime } from './utils';

type ScannerDeps = {
    world: Pick<GameWorld, 'resources' | 'nav' | 'terraIncognita'>;
    inventory: InventoryController;
    battery: EnergySystemController;
    positions: PositionalSystemController;
    markers: MarkersSystemController;
};

export type ScannerData = {
    maxRadius: number;
    scannedTiles: ScannedTilesData;
};

type ScannedTilesData = Set<NodeId>;
type ScannedTilesDataByFaction = Map<FactionId, ScannedTilesData>;
const emptyScannedData = (): ScannedTilesData => new Set();

export const SCANNER_SYSTEM_NAME = 'scanner';

export const SCANNER_FNS: CallableUnitSystemFunctions<ScannerData, ScannerDeps> = {
    find_closest_unscanned: {
        description: 'Finds the closest location that has not been scanned yet',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx, { world: { nav }, positions }) {
            const scanner = ctx.systemData;
            const location = positions.getEffectivePosition(ctx.unitId);
            const bfs = nav.bfs<NodeId>(location);
            let result = location;

            while (!bfs.isDone()) {
                const next = bfs.nextNodeToVisit();
                if (!scanner.scannedTiles.has(next.node)) {
                    result = next.node;
                    break;
                }

                bfs.expand();
            }

            yield usfSleep(bfsSleepTime(bfs.getVisited()));
            return { type: 'position', value: result };
        },
    },
    closest_surface_deposit: {
        description: 'Returns the location of the closest surface resource deposit',
        argNames: [],
        argTypes: [],
        returnType: 'position',
        *body(_, ctx, { positions, world: { nav, resources, terraIncognita } }) {
            const location = positions.getEffectivePosition(ctx.unitId);
            const bfs = nav.bfs<NodeId>(location);
            let result = location;

            while (!bfs.isDone()) {
                const next = bfs.nextNodeToVisit().node;

                if (
                    !terraIncognita.has(next) &&
                    resources
                        .findDeposits({ location: next, maxTier: ResourceTier.Tier1 })
                        .some((dep) => dep.amount > 0)
                ) {
                    result = next;
                    break;
                }

                bfs.expand();
            }

            yield usfSleep(bfsSleepTime(bfs.getVisited()));
            return { type: 'position', value: result };
        },
    },

    scan: {
        description: 'Scans for nearby resource deposits',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx, { positions, world, battery, markers }) {
            const scanner = ctx.systemData;
            let nFound = 0;
            const location = positions.getEffectivePosition(ctx.unitId);

            const bfs = world.nav.bfs(location);
            while (!bfs.isDone() && bfs.nextNodeToVisit().depth <= scanner.maxRadius) {
                if (!battery.withdraw(ctx.unitId, 1)) {
                    break;
                }

                const loc = bfs.nextNodeToVisit().node;
                const newDeposits = world.resources.discover(loc, ResourceTier.Tier2);

                if (newDeposits.length > 0) {
                    markers.getMapForUnit(ctx.unitId).set({
                        location: loc,
                        type: 'resource',
                        author: ctx.unitId,
                    });
                    nFound += newDeposits.length;
                }

                for (const deposit of newDeposits) {
                    markers.getMapForUnit(ctx.unitId).set({
                        location: loc,
                        type: 'resource:' + deposit.resource,
                        author: ctx.unitId,
                        attrs: {
                            resource: { type: 'string', value: deposit.resource },
                            tier: { type: 'number', value: deposit.tier },
                            amount: { type: 'number', value: deposit.amount },
                        },
                    });
                }

                scanner.scannedTiles.add(loc);
                bfs.expand();
            }

            yield usfSleep(bfsSleepTime(bfs.getVisited()));
            return { type: 'number', value: nFound };
        },
    },

    radius: {
        description: 'Returns the scan radius of this scanner',
        argNames: [],
        argTypes: [],
        returnType: 'number',
        *body(_, ctx) {
            return { type: 'number', value: ctx.systemData.maxRadius };
        },
    },
};

export function createScannerSystem(
    opts: CreateUnitSystemCommonOptions,
    world: ScannerDeps['world'],
    positions: PositionalSystemController,
    inventory: InventoryController,
    battery: EnergySystemController,
    markers: MarkersSystemController,
) {
    const scannedTilesByFaction: ScannedTilesDataByFaction = new Map();

    return createUnitSystem<ScannerData, CallableUnitSystemMessages>(opts, {
        name: SCANNER_SYSTEM_NAME,
        initialData({ config, faction }) {
            if (!config.scanner) {
                return null;
            }

            const scannedTiles = scannedTilesByFaction.getOrInsertComputed(faction, emptyScannedData);
            return { maxRadius: 3, scannedTiles };
        },

        messages: {
            ...usfHandlers<ScannerData, ScannerDeps>(SCANNER_FNS, {
                world,
                inventory,
                battery,
                positions,
                markers,
            }),
        },
    });
}
