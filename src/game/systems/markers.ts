import type { NavMesh } from '@/lib/NavMesh';
import { createEvent, type Event } from '@/lib/sparse';
import { extractTyped } from '../program/utils';
import { NodeId, type UnitId } from '../types';
import { MarkersMap } from './MarkersMap';
import type { PositionalSystemController } from './positions';
import { createUnitSystem } from './systems';
import type { CreateUnitSystemCommonOptions } from './types';
import {
    callableUnitSystemHandlers,
    returnToCpu,
    type CallableUnitSystemFunctions,
    type CallableUnitSystemMessages,
} from './utils';
import { FactionId } from '../factions';

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
    set: {
        description: 'Creates or rewrites a map marker at a specified location',
        argNames: ['location', 'type'],
        argTypes: ['position', 'string'],
        returnType: 'flag',
        init(args, ctx, _, { updated }) {
            const { markers } = ctx.systemData;
            const location = extractTyped(args, 'location', 'position');
            const type = extractTyped(args, 'type', 'string');
            const author = ctx.unitId;
            let existed = false;

            if (location && type) {
                existed = markers.set({ location: location.value, type: type.value, author });
                updated.trigger(markers, new Set([location.value]), type.value);
            }

            returnToCpu(ctx, { type: 'flag', value: existed });
            return false;
        },
    },
    set_in_radius: {
        description: 'Creates or rewrites markers on every tile around the center in specified radius',
        argNames: ['location', 'radius', 'type'],
        argTypes: ['position', 'number', 'string'],
        returnType: 'number',
        init(args, ctx, _, { nav, updated }) {
            const { markers } = ctx.systemData;
            const location = extractTyped(args, 'location', 'position');
            const radius = extractTyped(args, 'radius', 'number');
            const type = extractTyped(args, 'type', 'string');
            const author = ctx.unitId;
            const tilesAffected = new Set<NodeId>();

            if (location && radius && radius.value > 0 && type) {
                const bfs = nav.bfs(location.value);
                bfs.expandToDepth(Math.min(radius.value, 6));

                for (const tile of bfs.getVisited().keys()) {
                    markers.set({ location: tile, type: type.value, author });
                    tilesAffected.add(tile);
                }

                updated.trigger(markers, tilesAffected, type.value);
            }

            returnToCpu(ctx, { type: 'number', value: tilesAffected.size }, tilesAffected.size);
            return false;
        },
    },

    is_present: {
        description: 'Checks if a marker of given type exists at specified location',
        argNames: ['location', 'type'],
        argTypes: ['position', 'string'],
        returnType: 'flag',
        init(args, ctx) {
            const { markers } = ctx.systemData;
            const location = extractTyped(args, 'location', 'position');
            const type = extractTyped(args, 'type', 'string');
            let exists = false;

            if (location && type) {
                exists = markers.get(location.value, type.value) !== null;
            }

            returnToCpu(ctx, { type: 'flag', value: exists });
            return false;
        },
    },
    find_closest: {
        description:
            'Finds closest marker of a given type and returns its location (markers too far away may be not found)',
        argNames: ['type'],
        argTypes: ['string'],
        returnType: 'position',
        init(args, ctx, _, { positions, nav }) {
            const { markers } = ctx.systemData;
            const type = extractTyped(args, 'type', 'string');
            let result: NodeId | null = null;
            const location = positions.getEffectivePosition(ctx.unitId);

            if (type) {
                const found = markers.findClosest(nav, {
                    around: location,
                    maxDistance: MAX_SEARCH_DEPTH,
                    type: type.value,
                });

                if (found) {
                    result = found.location;
                }
            }

            returnToCpu(ctx, { type: 'position', value: result ?? location });
            return false;
        },
    },
    find_closest_without: {
        description: 'Finds closest location where a given marker type does not exist',
        argNames: ['type'],
        argTypes: ['string'],
        returnType: 'position',
        init(args, ctx, _, { positions, nav }) {
            const { markers } = ctx.systemData;
            const type = extractTyped(args, 'type', 'string');
            let result: NodeId | null = null;
            const location = positions.getEffectivePosition(ctx.unitId);

            if (type) {
                const found = markers.findClosest(nav, {
                    around: location,
                    maxDistance: MAX_SEARCH_DEPTH,
                    type: type.value,
                    isNegativeSearch: true,
                });

                if (found) {
                    result = found.location;
                }
            }

            returnToCpu(ctx, { type: 'position', value: result ?? location });
            return false;
        },
    },
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

        initialData(options, unitId) {
            return { markers: markersByFaction.getOrInsertComputed(options.faction, newMarkersMap) };
        },

        messages: {
            ...callableUnitSystemHandlers({ updated: controller.updated, positions, nav }, MARKERS_FNS),
        },
    });

    return { system, controller };
}
