import type { NavMesh } from '@/lib/NavMesh';
import { createEvent, type Event } from '@/lib/sparse';
import { FactionId } from '../factions';
import { NodeId, type UnitId } from '../types';
import { MarkersMap } from './MarkersMap';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    usfSleep,
    usfHandlers,
    typedUSF,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './func';

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

export const MARKERS_FNS: CallableUnitSystemFunctions<
    MarkersSystemData,
    { updated: MarkersSystemController['updated']; positions: PositionalSystemController; nav: NavMesh }
> = {
    set: typedUSF({
        description: 'Creates or rewrites a map marker at a specified location',
        args: { location: 'position', type: 'string' },
        returnType: 'flag',
        *body(args, ctx, { updated }) {
            const { markers } = ctx.systemData;
            const location = args.location.value;
            const type = args.type.value;
            const author = ctx.unitId;

            const existed = markers.set({ location: location, type: type, author });
            updated.trigger(markers, new Set([location]), type);

            return { type: 'flag', value: existed };
        },
    }),
    set_in_radius: typedUSF({
        description: 'Creates or rewrites markers on every tile around the center in specified radius',
        args: {
            location: 'position',
            radius: 'number',
            type: 'string',
        },
        returnType: 'number',
        *body(args, ctx, { nav, updated }) {
            const { markers } = ctx.systemData;
            const location = args.location.value;
            const radius = args.radius.value;
            const type = args.type.value;
            const author = ctx.unitId;
            const tilesAffected = new Set<NodeId>();

            if (radius > 0) {
                const bfs = nav.bfs(location);
                bfs.expandToDepth(Math.min(radius, 6));

                for (const tile of bfs.getVisited().keys()) {
                    markers.set({ location: tile, type, author });
                    yield usfSleep();
                    tilesAffected.add(tile);
                }

                updated.trigger(markers, tilesAffected, type);
            }

            return { type: 'number', value: tilesAffected.size };
        },
    }),

    is_present: typedUSF({
        description: 'Checks if a marker of given type exists at specified location',
        args: { location: 'position', type: 'string' },
        returnType: 'flag',
        *body(args, ctx) {
            const { markers } = ctx.systemData;
            const exists = markers.get(args.location.value, args.type.value) !== null;
            return { type: 'flag', value: exists };
        },
    }),
    find_closest: typedUSF({
        description:
            'Finds closest marker of a given type and returns its location (markers too far away may be not found)',
        args: { type: 'string' },
        returnType: 'position',
        *body(args, ctx, { positions, nav }) {
            const { markers } = ctx.systemData;
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

            return { type: 'position', value: result ?? location };
        },
    }),
    find_closest_without: typedUSF({
        description: 'Finds closest location where a given marker type does not exist',
        args: { type: 'string' },
        returnType: 'position',
        *body(args, ctx, { positions, nav }) {
            const { markers } = ctx.systemData;
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

            return { type: 'position', value: result ?? location };
        },
    }),
};

const newMarkersMap = () => new MarkersMap();

export function createMarkers(
    opts: CreateUnitSystemCommonOptions,
    positions: PositionalSystemController,
    nav: NavMesh,
) {
    const markersByFaction = new Map<FactionId, MarkersMap>();

    const controller: MarkersSystemController = {
        getMap(faction) {
            return markersByFaction.getOrInsertComputed(faction, newMarkersMap);
        },
        getMapForUnit(unitId) {
            return system.getData(unitId)!.markers;
        },
        updated: createEvent(),
    };

    const system = createUnitSystem<MarkersSystemData, CallableUnitSystemMessages>(opts, {
        name: MARKERS_SYSTEM_NAME,

        initialData({ faction }) {
            return { markers: markersByFaction.getOrInsertComputed(faction, newMarkersMap) };
        },

        messages: {
            ...usfHandlers(MARKERS_FNS, { updated: controller.updated, positions, nav }),
        },
    });

    return { system, controller };
}
