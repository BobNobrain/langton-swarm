import { FactionId } from '../factions';
import { ResourceTier } from '../resources';
import type { NodeId } from '../types';
import type { GameWorld } from '../world';
import type { EnergySystemController } from './energy';
import type { InventoryController } from './inventory';
import type { MarkersSystemController } from './markers';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator, SpawnOptions } from './types';
import { fnReturn, UnitSystem } from './UnitSystem';
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

export const SCANNER_FNS = {
    find_closest_unscanned: UnitSystem.declareFn({
        name: 'find_closest_unscanned',
        args: {},
        returnType: 'position',
        description: 'Finds the closest location that has not been scanned yet',
    }),
    closest_surface_deposit: UnitSystem.declareFn({
        name: 'closest_surface_deposit',
        args: {},
        returnType: 'position',
        description: 'Returns the location of the closest surface resource deposit',
    }),

    scan: UnitSystem.declareFn({
        name: 'scan',
        args: {},
        returnType: 'number',
        description: 'Scans for nearby resource deposits',
    }),

    radius: UnitSystem.declareFn({
        name: 'radius',
        args: {},
        returnType: 'number',
        description: 'Returns the scan radius of this scanner',
    }),
} as const;

type SaveData = {
    v: 1;
    scanned: ScannedTilesDataByFaction;
};

export class ScannerSystem extends UnitSystem<ScannerData, SaveData> {
    private scannedTilesByFaction: ScannedTilesDataByFaction = new Map();

    constructor(
        opts: UnitSystemOrchestrator,
        { nav, resources, terraIncognita }: ScannerDeps['world'],
        positions: PositionalSystemController,
        inventory: InventoryController,
        battery: EnergySystemController,
        markers: MarkersSystemController,
    ) {
        super(SCANNER_SYSTEM_NAME, opts);

        if (this.loadedState) {
            this.scannedTilesByFaction = this.loadedState.scanned;
        }

        this.registerFn(SCANNER_FNS.find_closest_unscanned).implement((_, ctx) => {
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

            return fnReturn({ type: 'position', value: result }, bfsSleepTime(bfs.getVisited()));
        });

        this.registerFn(SCANNER_FNS.closest_surface_deposit).implement((_, ctx) => {
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

            return fnReturn({ type: 'position', value: result }, bfsSleepTime(bfs.getVisited()));
        });

        this.registerFn(SCANNER_FNS.scan).implement((_, ctx) => {
            const scanner = ctx.systemData;
            let nFound = 0;
            const location = positions.getEffectivePosition(ctx.unitId);

            const bfs = nav.bfs(location);
            while (!bfs.isDone() && bfs.nextNodeToVisit().depth <= scanner.maxRadius) {
                if (!battery.withdraw(ctx.unitId, 1)) {
                    break;
                }

                const loc = bfs.nextNodeToVisit().node;
                const newDeposits = resources.discover(loc, ResourceTier.Tier2);

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

            return fnReturn({ type: 'number', value: nFound }, bfsSleepTime(bfs.getVisited()));
        });

        this.registerFn(SCANNER_FNS.scan).implement((_, ctx) =>
            fnReturn({ type: 'number', value: ctx.systemData.maxRadius }),
        );
    }

    protected initialData({ config, faction }: SpawnOptions): ScannerData | null {
        if (!config.scanner) {
            return null;
        }

        const scannedTiles = this.scannedTilesByFaction.getOrInsertComputed(faction, emptyScannedData);
        return { maxRadius: 3, scannedTiles };
    }

    protected onSave(): SaveData {
        return { v: 1, scanned: this.scannedTilesByFaction };
    }
}
