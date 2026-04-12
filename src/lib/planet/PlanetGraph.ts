import { calcCenter, diff, mul, normz, size, sizeSquared, sum, ZERO, type RawVertex } from '../3d';
import { drawInteger, type RandomSequence } from '../random';
import { OctoTree } from './OctoTree';

export class PlanetGraph {
    private vs: RawVertex[] = [];
    private faces: number[][] = [];
    private connections: Set<number>[] = [];

    constructor(size = 1) {
        const phi = (1.0 + Math.sqrt(5.0)) / 2.0;
        const du = size / Math.sqrt(phi * phi + 1.0);
        const dv = phi * du;

        this.vs.push(
            [0, +dv, +du],
            [0, +dv, -du],
            [0, -dv, +du],
            [0, -dv, -du],
            [+du, 0, +dv],
            [-du, 0, +dv],
            [+du, 0, -dv],
            [-du, 0, -dv],
            [+dv, +du, 0],
            [+dv, -du, 0],
            [-dv, +du, 0],
            [-dv, -du, 0],
        );

        this.faces.push(
            [8, 1, 0],
            [5, 4, 0],
            [10, 5, 0],
            [4, 8, 0],
            [1, 10, 0],
            [8, 6, 1],
            [6, 7, 1],
            [7, 10, 1],
            [11, 3, 2],
            [9, 4, 2],
            [4, 5, 2],
            [3, 9, 2],
            [5, 11, 2],
            [7, 6, 3],
            [11, 7, 3],
            [6, 9, 3],
            [9, 8, 4],
            [10, 11, 5],
            [8, 9, 6],
            [11, 10, 7],
        );
    }

    size(): number {
        return this.vs.length;
    }
    nFaces(): number {
        return this.faces.length;
    }

    scale(f: number) {
        for (let i = 0; i < this.vs.length; i++) {
            const [x, y, z] = this.vs[i];
            this.vs[i] = [x * f, y * f, z * f];
        }
    }

    coords(): readonly RawVertex[] {
        return this.vs;
    }
    getFaces() {
        return this.faces;
    }

    subdivide(subdivisions: number) {
        const existingVerticies = new OctoTree<number>();
        for (let vi = 0; vi < this.vs.length; vi++) {
            existingVerticies.insert(vi, this.vs[vi]);
        }

        for (let i = 0; i < subdivisions; i++) {
            const oldFaces = this.faces.slice();
            this.faces.length = 0;

            for (const triangle of oldFaces) {
                const coords = triangle.map((i) => this.vs[i]);
                const middleCoords = [
                    calcCenter([coords[0], coords[1]]),
                    calcCenter([coords[1], coords[2]]),
                    calcCenter([coords[2], coords[0]]),
                ];

                const middles: number[] = [];
                for (const coords of middleCoords) {
                    let mvi = existingVerticies.getFirstCloseEnough(coords, 1e-9);
                    if (mvi === null) {
                        mvi = this.vs.length;
                        this.vs.push(coords);
                        existingVerticies.insert(mvi, coords);
                    }

                    middles.push(mvi);
                }

                this.faces.push(
                    [middles[2], triangle[0], middles[0]],
                    [middles[0], triangle[1], middles[1]],
                    [middles[1], triangle[2], middles[2]],
                    middles,
                );
            }
        }
    }

    rotateRandomEdges({ random, n }: { random: RandomSequence; n: number }) {
        const nRotations = n;
        const nFaces = this.faces.length;

        const facesDone = new Set<number>();

        for (let r = 0; r < nRotations; r++) {
            if (nFaces <= facesDone.size) {
                break;
            }

            const face1Index = drawInteger(random, { min: 0, max: nFaces });
            if (facesDone.has(face1Index)) {
                continue;
            }

            const face1 = this.faces[face1Index];
            if (face1.length !== 3) {
                continue;
            }

            const targetEdgeStartIndex = drawInteger(random, { min: 0, max: face1.length });
            const targetEdgeEndIndex = targetEdgeStartIndex === face1.length - 1 ? 0 : targetEdgeStartIndex + 1;
            const targetEdgeStart = face1[targetEdgeStartIndex];
            const targetEdgeEnd = face1[targetEdgeEndIndex];

            let face2Index: number;
            for (face2Index = 0; face2Index < nFaces; ++face2Index) {
                if (face2Index === face1Index) {
                    continue;
                }

                const face2 = this.faces[face2Index];
                if (face2.includes(targetEdgeStart) && face2.includes(targetEdgeEnd)) {
                    break;
                }
            }

            if (facesDone.has(face2Index)) {
                continue;
            }

            const face2 = this.faces[face2Index];
            if (face2.length !== 3) {
                continue;
            }

            facesDone.add(face1Index);
            facesDone.add(face2Index);

            const oppositeVertex1 = face1.filter((vi) => vi !== targetEdgeStart && vi !== targetEdgeEnd)[0];
            const oppositeVertex2 = face2.filter((vi) => vi !== targetEdgeStart && vi !== targetEdgeEnd)[0];

            this.faces[face1Index] = [oppositeVertex1, targetEdgeStart, oppositeVertex2];
            this.faces[face2Index] = [oppositeVertex2, targetEdgeEnd, oppositeVertex1];
        }
    }

    relax({ targetEdgeLength, maxPasses = 100, minChange = 1e-4, eps = 1e-4, changeRate = 0.01, seq }: RelaxOptions) {
        this.calcConnections();

        const minChangeSquared = minChange * minChange;
        const targetLengthSquared = targetEdgeLength * targetEdgeLength;

        let pass = 0;
        for (pass = 0; pass < maxPasses; pass++) {
            const maxChangeDoneSquared = this.relaxationPass({ changeRate, eps, seq, targetLengthSquared });

            if (maxChangeDoneSquared < minChangeSquared) {
                console.log('min change reached at pass', pass);
                break;
            }
        }
        console.log('relaxed in passes of ', pass);
    }

    getConnections(): Set<number>[] {
        if (this.connections.length !== this.vs.length) {
            this.calcConnections();
        }

        return this.connections;
    }

    bfs(start: number, cb: (tileId: number, depth: number) => void | boolean) {
        const queue: { tileId: number; d: number }[] = [{ tileId: start, d: 0 }];
        const visited = new Set<number>();

        while (queue.length) {
            const { tileId, d } = queue.shift()!;

            const stop = cb(tileId, d);
            if (stop) {
                break;
            }

            visited.add(tileId);
            for (const nb of this.connections[tileId]) {
                if (visited.has(nb)) {
                    continue;
                }

                queue.push({ tileId: nb, d: d + 1 });
            }
        }
    }

    private calcConnections() {
        const connections = this.vs.map(() => new Set<number>());

        for (const face of this.faces) {
            const first = face[0];
            const last = face[face.length - 1];
            connections[first].add(last);
            connections[last].add(first);

            for (let i = 1; i < face.length; i++) {
                const v0 = face[i - 1];
                const v1 = face[i];
                connections[v0].add(v1);
                connections[v1].add(v0);
            }
        }

        this.connections = connections;
    }

    private relaxationPass(opts: {
        targetLengthSquared: number;
        eps: number;
        changeRate: number;
        seq: RandomSequence;
    }) {
        const connections = this.connections;
        const nVerticies = this.vs.length;
        const { targetLengthSquared, eps, changeRate, seq } = opts;
        const forcesByVertex = new Array<RawVertex>(nVerticies).fill(ZERO);

        for (let vi = 0; vi < nVerticies; vi++) {
            for (const connectedVertex of connections[vi]) {
                const targetV = this.vs[vi];
                const neighbourV = this.vs[connectedVertex];
                const edge = diff(targetV, neighbourV);
                const edgeLengthSquared = sizeSquared(edge);

                const lenghtsDelta = Math.sqrt(targetLengthSquared) - Math.sqrt(edgeLengthSquared);
                if (Math.abs(lenghtsDelta) < eps) {
                    continue;
                }

                const force: RawVertex = mul(edge, lenghtsDelta);
                forcesByVertex[vi] = sum(forcesByVertex[vi], force);
            }
        }

        let maxChangeDoneSquared = 0;
        for (let vi = 0; vi < nVerticies; vi++) {
            const totalForce = forcesByVertex[vi];
            const noisedTotalForce = withRandomShift(seq, size(totalForce) / 10, totalForce);

            this.vs[vi] = normz(sum(this.vs[vi], mul(noisedTotalForce, changeRate)));

            const changeDoneSquared = sizeSquared(totalForce) * changeRate;

            if (maxChangeDoneSquared < changeDoneSquared) {
                maxChangeDoneSquared = changeDoneSquared;
            }
        }

        return maxChangeDoneSquared;
    }
}

type RelaxOptions = {
    maxPasses?: number;
    minChange?: number;
    changeRate?: number;
    eps?: number;
    targetEdgeLength: number;
    seq: RandomSequence;
};

function withRandomShift(seq: RandomSequence, scale: number, input: RawVertex): RawVertex {
    return [input[0] + scale * (2 * seq() - 1), input[1] + scale * (2 * seq() - 1), input[2] + scale * (2 * seq() - 1)];
}
