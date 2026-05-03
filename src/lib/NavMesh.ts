import { distSquared, type RawVertex } from './3d';
import { BFS } from './bfs';

type VisitedNode = {
    from: number;
    length: number;
};

type VisitCandidate = {
    node: number;
    dToTarget: number;
    pathLength: number;
};

export class NavMesh {
    private coords: readonly RawVertex[];
    private connections: number[][];

    constructor(coords: readonly RawVertex[], connections: Set<number>[]) {
        this.coords = coords;
        this.connections = connections.map((cs) => Array.from(cs).sort((a, b) => a - b));
    }

    // TODO: optimize performance somehow?
    findPath(from: number, to: number): number[] {
        if (from === to) {
            return [from];
        }
        if (this.connections[from].includes(to)) {
            return [from, to];
        }

        const toCoords = this.coords[to];
        const spatialDistances = new Map<number, number>();
        const candidatesToVisit: VisitCandidate[] = [];
        const visited = new Map<number, VisitedNode>();

        candidatesToVisit.push({ node: from, dToTarget: Infinity, pathLength: 0 });
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
                    let dist = spatialDistances.get(c);
                    if (dist === undefined) {
                        dist = Math.sqrt(distSquared(this.coords[c], toCoords));
                        spatialDistances.set(c, dist);
                    }
                    candidatesToVisit.push({ node: c, dToTarget: dist, pathLength: currentVisit.length });
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

    getNeighbours(node: number): number[] {
        return this.connections[node];
    }

    bfs<NId extends number = number>(start: NId) {
        return new BFS(start, this.connections as NId[][]);
    }
}

function candidateSorter(c1: VisitCandidate, c2: VisitCandidate): number {
    return Math.sqrt(c2.dToTarget) + c2.pathLength - (Math.sqrt(c1.dToTarget) + c2.pathLength);
}
