import { distSquared, type RawVertex } from './3d';

type VisitedNode = {
    from: number;
    length: number;
};

type VisitCandidate = {
    node: number;
    d2ToTarget: number;
};

export class NavMesh {
    private coords: readonly RawVertex[];
    private connections: number[][];

    constructor(coords: readonly RawVertex[], connections: Set<number>[]) {
        this.coords = coords;
        this.connections = connections.map((cs) => Array.from(cs).sort((a, b) => a - b));
    }

    // TODO: optimize performance and also somehow make it find optimal path?
    findPath(from: number, to: number): number[] {
        if (from === to) {
            return [from];
        }
        if (this.connections[from].includes(to)) {
            return [from, to];
        }

        const toCoords = this.coords[to];
        const spatialDistanceSquares = new Map<number, number>();
        const candidatesToVisit: VisitCandidate[] = [];
        const visited = new Map<number, VisitedNode>();

        candidatesToVisit.push({ node: from, d2ToTarget: Infinity });
        visited.set(from, { length: 0, from: -1 });

        while (candidatesToVisit.length) {
            const next = candidatesToVisit.pop()!;
            const currentPathLength = visited.get(next.node)!.length;
            const connections = this.connections[next.node];

            for (const c of connections) {
                const bestVisit = visited.get(c);
                const currentVisit: VisitedNode = { length: currentPathLength + 1, from: next.node };
                let isCandidate = false;

                if (!bestVisit || currentVisit.length < bestVisit.length) {
                    visited.set(c, currentVisit);
                    if (c === to) {
                        break;
                    }

                    isCandidate = true;
                }

                if (isCandidate) {
                    let d2 = spatialDistanceSquares.get(c);
                    if (d2 === undefined) {
                        d2 = distSquared(this.coords[c], toCoords);
                        spatialDistanceSquares.set(c, d2);
                    }
                    candidatesToVisit.push({ node: c, d2ToTarget: d2 });
                }
            }

            if (visited.get(to)) {
                break;
            }

            candidatesToVisit.sort(candidateSorter);
        }

        const path: number[] = [];
        let cursor = visited.get(to);
        if (!cursor) {
            return path;
        }

        path.push(to);
        while (cursor.from !== -1) {
            path.push(cursor.from);
            cursor = visited.get(cursor.from)!;
        }

        path.reverse();
        return path;
    }
}

function candidateSorter(c1: VisitCandidate, c2: VisitCandidate): number {
    return c2.d2ToTarget - c1.d2ToTarget;
}
