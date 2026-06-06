import type { NavMesh } from '@/lib/NavMesh';
import type { BsmlValue } from '../program/value';
import type { NodeId, UnitId } from '../types';

export type MarkerData = {
    type: string;
    location: NodeId;
    author: UnitId;
    attrs?: Record<string, BsmlValue>;
};

export type MarkersMapSerialized = {
    data: Map<NodeId, Record<string, MarkerData>>;
};

export class MarkersMap {
    private byLocation = new Map<NodeId, Record<string, MarkerData>>();

    static deserialize({ data }: MarkersMapSerialized): MarkersMap {
        const result = new MarkersMap();
        result.byLocation = data;
        return result;
    }

    getAllAt(location: NodeId) {
        return this.byLocation.get(location) ?? {};
    }

    getAll(): MarkerData[] {
        const result: MarkerData[] = [];
        for (const byType of this.byLocation.values()) {
            result.push(...Object.values(byType));
        }
        return result;
    }

    get(at: NodeId, type: string): MarkerData | null {
        const byType = this.byLocation.get(at);
        if (!byType) {
            return null;
        }

        return byType[type] ?? null;
    }

    set(marker: MarkerData): boolean {
        const byType = this.byLocation.getOrInsert(marker.location, {});
        const existed = Boolean(byType[marker.type]);
        byType[marker.type] = marker;
        return existed;
    }

    findClosest(
        nav: NavMesh,
        params: {
            around: NodeId;
            type: string;
            maxDistance: number;
            isNegativeSearch?: boolean;
        },
    ): { marker: MarkerData | null; location: NodeId; distance: number } | null {
        const queue: { location: NodeId; distance: number }[] = [{ location: params.around, distance: 0 }];
        const visited = new Set<NodeId>();

        while (queue.length) {
            const next = queue.shift()!;
            visited.add(next.location);

            const byType = this.byLocation.get(next.location);
            const marker = (byType && byType[params.type]) || null;

            if (!params.isNegativeSearch && marker) {
                return { marker, location: next.location, distance: next.distance };
            } else if (params.isNegativeSearch && !marker) {
                return { marker: null, location: next.location, distance: next.distance };
            }

            if (next.distance >= params.maxDistance) {
                continue;
            }

            const nbors = nav.getNeighbours(next.location) as NodeId[];
            const nborDistance = next.distance + 1;
            for (const nbor of nbors) {
                if (visited.has(nbor)) {
                    continue;
                }
                queue.push({ location: nbor, distance: nborDistance });
            }
        }

        return null;
    }

    serialize(): MarkersMapSerialized {
        return { data: this.byLocation };
    }
}
