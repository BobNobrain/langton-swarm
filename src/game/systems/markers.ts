import type { NavMesh } from '@/lib/NavMesh';
import { createEvent, type Event } from '@/lib/sparse';
import { FactionId } from '../factions';
import { NodeId, type UnitId } from '../types';
import { MarkersMap, type MarkerData, type MarkersMapSerialized } from './MarkersMap';
import type { PositionalSystemController } from './positions';
import type { UnitSystemOrchestrator } from './types';
import { fnReturn, fnSleep, UnitSystem } from './UnitSystem';
import type { FactionSystemController } from './faction';

export const MARKERS_SYSTEM_NAME = 'markers';
const MAX_SEARCH_DEPTH = 10;

export type MarkersSystemController = {
    getMap(fid: FactionId): MarkersMap;
    getMapForUnit(unitId: UnitId): MarkersMap;
    updated: Event<(map: MarkersMap, at: Set<NodeId>, type: string) => void>;
};

type MarkersSystemData = {
    markers: MarkersMap;
};

/*
markers.search_for_type("resource", 10)
markers.search_all(10)

loop tile over markers.search_results {
    if markers.is_present(tile, "copper") or markers.is_present(tile, "titanium") {
        navigator.find_route(tile)
        state :navigating
    }
}

state :roaming

markers.set_in_radius(navigator.location, scanner.radius, "_scanned")
 */

const newMarkersMap = () => new MarkersMap();

type SaveData = {
    v: 1;
    byFaction: Map<FactionId, MarkersMapSerialized>;
};

export const MARKERS_FNS = {
    set: UnitSystem.declareFn({
        name: 'set',
        args: { location: 'position', type: 'string' },
        returnType: 'flag',
        description: 'Creates or rewrites a map marker at a specified location',
    }),
    set_in_radius: UnitSystem.declareFn({
        name: 'set_in_radius',
        args: {
            location: 'position',
            radius: 'number',
            type: 'string',
        },
        returnType: 'number',
        description: 'Creates or rewrites markers on every tile around the center in specified radius',
    }),

    is_present: UnitSystem.declareFn({
        name: 'is_present',
        args: { location: 'position', type: 'string' },
        returnType: 'flag',
        description: 'Checks if a marker of given type exists at specified location',
    }),
    find_closest: UnitSystem.declareFn({
        name: 'find_closest',
        args: { type: 'string' },
        returnType: 'position',
        description:
            'Finds closest marker of a given type and returns its location (markers too far away may be not found)',
    }),
    find_closest_without: UnitSystem.declareFn({
        name: 'find_closest_without',
        args: { type: 'string' },
        returnType: 'position',
        description: 'Finds closest location where a given marker type does not exist',
    }),
} as const;

export class MarkersSystem extends UnitSystem<true, SaveData> implements MarkersSystemController {
    readonly updated: Event<(map: MarkersMap, at: Set<NodeId>, type: string) => void> = createEvent();
    private markersByFaction = new Map<FactionId, MarkersMap>();

    constructor(
        opts: UnitSystemOrchestrator,
        positions: PositionalSystemController,
        nav: NavMesh,
        private factions: FactionSystemController,
    ) {
        super(MARKERS_SYSTEM_NAME, opts);

        if (this.loadedState) {
            for (const [fid, serialized] of this.loadedState.byFaction.entries()) {
                this.markersByFaction.set(fid, MarkersMap.deserialize(serialized));
            }
        }

        this.registerFn(MARKERS_FNS.set).implement(({ args }, ctx) => {
            const markers = this.getMapForUnit(ctx.unitId);
            const location = args.location.value;
            const type = args.type.value;
            const author = ctx.unitId;

            const existed = markers.set({ location: location, type: type, author });
            this.updated.trigger(markers, new Set([location]), type);

            return fnReturn({ type: 'flag', value: existed });
        });

        this.registerFn(MARKERS_FNS.set_in_radius).implement<{
            markersToAdd?: MarkerData[];
            nTotal?: number;
        }>((state, ctx) => {
            if (!state.markersToAdd) {
                const location = state.args.location.value;
                const radius = state.args.radius.value;
                if (radius <= 0) {
                    return fnReturn({ type: 'number', value: 0 });
                }

                const type = state.args.type.value;
                const author = ctx.unitId;
                const bfs = nav.bfs(location);
                bfs.expandToDepth(Math.min(radius, 6));
                state.markersToAdd = [];

                for (const tile of bfs.getVisited().keys()) {
                    state.markersToAdd.push({ location: tile, type, author });
                }

                state.nTotal = state.markersToAdd.length;
                return fnSleep();
            }

            if (!state.markersToAdd.length) {
                return fnReturn({ type: 'number', value: state.nTotal ?? 0 });
            }

            const marker = state.markersToAdd.pop()!;
            const map = this.getMapForUnit(ctx.unitId);
            map.set(marker);
            this.updated.trigger(map, new Set([marker.location]), marker.type);
            return fnSleep();
        });

        this.registerFn(MARKERS_FNS.is_present).implement(({ args }, ctx) => {
            const markers = this.getMapForUnit(ctx.unitId);
            const exists = markers.get(args.location.value, args.type.value) !== null;
            return fnReturn({ type: 'flag', value: exists });
        });

        this.registerFn(MARKERS_FNS.find_closest).implement(({ args }, ctx) => {
            const markers = this.getMapForUnit(ctx.unitId);
            const type = args.type.value;
            let result: NodeId | null = null;
            const location = positions.getEffectivePosition(ctx.unitId);

            const found = markers.findClosest(nav, {
                around: location,
                maxDistance: MAX_SEARCH_DEPTH,
                type: type,
            });

            if (found) {
                result = found.location;
            }

            return fnReturn({ type: 'position', value: result ?? location });
        });

        this.registerFn(MARKERS_FNS.find_closest_without).implement(({ args }, ctx) => {
            const markers = this.getMapForUnit(ctx.unitId);
            const type = args.type.value;
            let result: NodeId | null = null;
            const location = positions.getEffectivePosition(ctx.unitId);

            if (type) {
                const found = markers.findClosest(nav, {
                    around: location,
                    maxDistance: MAX_SEARCH_DEPTH,
                    type: type,
                    isNegativeSearch: true,
                });

                if (found) {
                    result = found.location;
                }
            }

            return fnReturn({ type: 'position', value: result ?? location });
        });
    }

    getMap(faction: FactionId): MarkersMap {
        return this.markersByFaction.getOrInsertComputed(faction, newMarkersMap);
    }
    getMapForUnit(unitId: UnitId): MarkersMap {
        const fid = this.factions.getFaction(unitId);
        return this.markersByFaction.getOrInsertComputed(fid, newMarkersMap);
    }

    protected initialData(): true | null {
        return true;
    }

    protected onSave(): SaveData {
        const serialized = new Map<FactionId, MarkersMapSerialized>();
        for (const [fid, map] of this.markersByFaction.entries()) {
            serialized.set(fid, map.serialize());
        }

        return { v: 1, byFaction: serialized };
    }
}
