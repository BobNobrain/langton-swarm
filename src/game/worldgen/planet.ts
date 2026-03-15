import { Vector3 } from 'three';
import { diff, mul, normz, size, sizeSquared, sum, ZERO, type RawVertex } from '@/lib/3d';
import { icosahedron } from '@/lib/icosa';
import type { MeshBuilder } from '@/lib/MeshBuilder';
import { drawInteger, RandomNumberGenerator, type RandomSequence } from '@/lib/random';
import { SurfaceNode, type Planet } from '../types';
import { generateResourceDeposits } from './resources';

export function generatePlanet(seed: string): Planet {
    const mb = createPlanetGeometry(seed);
    const nodes = new Array<SurfaceNode>(mb.size().verticies);
    const connections = mb.calculateConnectionMap();
    for (let v = 0; v < nodes.length; v++) {
        nodes[v] = {
            index: v,
            position: new Vector3(...mb.coords(v)),
            connections: connections[v],
        };
    }

    const planet: Planet = {
        nodes,
        resources: new Map(),
    };

    generateResourceDeposits(seed, planet);

    return planet;
}

function createPlanetGeometry(seed: string): MeshBuilder {
    const SIZE = 1;
    const planet = icosahedron({
        size: SIZE,
        subdivisions: 4,
    });

    const rng = new RandomNumberGenerator(seed);
    const seq = rng.detached();
    rotateRandomEdges({
        builder: planet,
        seq,
        minRotations: 50,
        maxRotations: 100,
    });

    const idealFaceArea = (4 * Math.PI * SIZE * SIZE) / planet.size().faces;
    const idealEdgeLength = Math.sqrt((idealFaceArea * 4) / Math.sqrt(3));

    relaxMesh(planet, {
        targetEdgeLength: idealEdgeLength,
        maxPasses: 100,
        changeRate: 0.9,
        minChange: idealEdgeLength * 0.01,
        seq,
    });

    return planet;
}

type RotatorOptions = {
    builder: MeshBuilder;
    seq: RandomSequence;
    minRotations?: number;
    maxRotations?: number;
};

function rotateRandomEdges({ builder, seq, minRotations = 10, maxRotations = 30 }: RotatorOptions): void {
    const size = builder.size();
    const nRotations = drawInteger(seq, { min: minRotations, max: maxRotations });

    const facesDone = new Set<number>();

    for (let r = 0; r < nRotations; r++) {
        if (size.faces <= facesDone.size) {
            break;
        }

        const face1Index = drawInteger(seq, { min: 0, max: size.faces });
        if (facesDone.has(face1Index)) {
            continue;
        }

        const face1 = builder.face(face1Index);

        const targetEdgeStartIndex = drawInteger(seq, { min: 0, max: face1.length });
        const targetEdgeEndIndex = targetEdgeStartIndex === face1.length - 1 ? 0 : targetEdgeStartIndex + 1;
        const targetEdgeStart = face1[targetEdgeStartIndex];
        const targetEdgeEnd = face1[targetEdgeEndIndex];

        const face2Index = builder
            .findConnectedFaces([targetEdgeStart, targetEdgeEnd])
            .filter((fi) => fi !== face1Index)[0];
        if (facesDone.has(face2Index)) {
            continue;
        }

        const face2 = builder.face(face2Index);

        facesDone.add(face1Index);
        facesDone.add(face2Index);

        const oppositeVertex1 = face1.filter((vi) => vi !== targetEdgeStart && vi !== targetEdgeEnd)[0];
        const oppositeVertex2 = face2.filter((vi) => vi !== targetEdgeStart && vi !== targetEdgeEnd)[0];

        builder.replaceFace(face1Index, [oppositeVertex1, targetEdgeStart, oppositeVertex2]);
        builder.replaceFace(face2Index, [oppositeVertex2, targetEdgeEnd, oppositeVertex1]);
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

function relaxMesh(
    builder: MeshBuilder,
    { targetEdgeLength, maxPasses = 100, minChange = 1e-4, eps = 1e-4, changeRate = 0.01, seq }: RelaxOptions,
): void {
    const minChangeSquared = minChange * minChange;
    const relaxer = new EdgeLengthRelaxer(builder, { targetEdgeLength, eps, changeRate, seq });

    let pass = 0;
    for (pass = 0; pass < maxPasses; pass++) {
        const maxChangeDoneSquared = relaxer.pass(pass);

        if (maxChangeDoneSquared < minChangeSquared) {
            console.log('min change reached at pass', pass);
            break;
        }
    }
    console.log('relaxed in passes of ', pass);
}

class EdgeLengthRelaxer {
    private nVerticies: number;
    private connections: Set<number>[];
    private targetLengthSquared: number;
    private eps: number;
    private changeRate: number;
    private seq: RandomSequence;

    constructor(
        private builder: MeshBuilder,
        { targetEdgeLength, eps = 1e-4, changeRate = 0.05, seq }: RelaxOptions,
    ) {
        this.nVerticies = builder.size().verticies;
        this.connections = builder.calculateConnectionMap();
        this.targetLengthSquared = targetEdgeLength * targetEdgeLength;
        this.eps = eps;
        this.changeRate = changeRate;
        this.seq = seq;
    }

    pass(_iterationNumber: number) {
        const { builder, connections, targetLengthSquared, eps, changeRate } = this;
        const forcesByVertex = new Array<RawVertex>(this.nVerticies).fill(ZERO);

        for (let vi = 0; vi < this.nVerticies; vi++) {
            for (const connectedVertex of connections[vi]) {
                const targetV = builder.coords(vi);
                const neighbourV = builder.coords(connectedVertex);
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
        for (let vi = 0; vi < this.nVerticies; vi++) {
            const totalForce = forcesByVertex[vi];
            const noisedTotalForce = withRandomShift(this.seq, size(totalForce) / 10, totalForce);

            const vertex = builder.coords(vi);
            builder.setCoords(vi, normz(sum(vertex, mul(noisedTotalForce, changeRate))));

            const changeDoneSquared = sizeSquared(totalForce) * changeRate;

            if (maxChangeDoneSquared < changeDoneSquared) {
                maxChangeDoneSquared = changeDoneSquared;
            }
        }

        return maxChangeDoneSquared;
    }
}

function withRandomShift(seq: RandomSequence, scale: number, input: RawVertex): RawVertex {
    return [input[0] + scale * (2 * seq() - 1), input[1] + scale * (2 * seq() - 1), input[2] + scale * (2 * seq() - 1)];
}
