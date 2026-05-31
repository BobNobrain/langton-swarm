import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, type Object3D } from 'three';
import type { NodeId } from '@/game';
import type { RawMesh } from '@/lib/planet/RawMesh';
import type { OctoTree } from '@/lib/planet/OctoTree';

const bordersMat = new LineBasicMaterial({ color: 0xffffff, opacity: 0.2, linewidth: 2, transparent: true });
const cliffEdgesMat = new LineBasicMaterial({ color: 0xef5412, opacity: 0.4, linewidth: 2, transparent: true });
const SCALE_UP = 1.001;
const EPS = 1e-6;

export class TileBorders {
    private bordersGeometry = new BufferGeometry();
    private borders = new LineSegments(this.bordersGeometry, bordersMat);

    private cliffEdgesGeometry = new BufferGeometry();
    private cliffBorders = new LineSegments(this.cliffEdgesGeometry, cliffEdgesMat);

    constructor(
        private meshData: RawMesh<NodeId, unknown>,
        private vertexIndex: OctoTree<number>,
        private cliffEdges: Map<number, Set<number>>,
        private nRealVerticies: number,
    ) {
        this.borders.name = 'tileBorders';
        this.borders.renderOrder = -1;

        this.rerender();
    }

    obj(): Object3D[] {
        return [this.borders, this.cliffBorders];
    }

    rerender() {
        const borderCoords: number[] = [];
        const cliffCoords: number[] = [];
        const added = new Map<number, Set<number>>();
        const edges: [number, number][] = [];

        const vs = this.meshData.vs;
        const index = this.vertexIndex;

        for (let i = 0; i < this.meshData.triangles.length; i++) {
            const [a, b, c] = this.meshData.triangles[i];
            edges.length = 0;

            const aOk = a < this.nRealVerticies;
            const bOk = b < this.nRealVerticies;
            const cOk = c < this.nRealVerticies;

            if (aOk && bOk && cOk) {
                continue;
            }

            if (aOk && bOk) {
                edges.push([a, b]);
            }
            if (aOk && cOk) {
                edges.push([a, c]);
            }
            if (bOk && cOk) {
                edges.push([b, c]);
            }

            for (let e = 0; e < edges.length; e++) {
                const [a, b] = edges[e];

                const originalA = index.getFirstCloseEnough(vs[a], EPS) ?? a;
                const originalB = index.getFirstCloseEnough(vs[b], EPS) ?? b;

                const min = Math.min(originalA, originalB);
                const max = Math.max(originalA, originalB);

                const alreadyIn = added.getOrInsert(min, new Set());
                if (alreadyIn.has(max)) {
                    continue;
                }

                alreadyIn.add(max);

                const [minX, minY, minZ] = vs[min];
                const [maxX, maxY, maxZ] = vs[max];

                const isCliffEdge = this.cliffEdges.get(min)?.has(max);
                const coords = isCliffEdge ? cliffCoords : borderCoords;
                coords.push(minX * SCALE_UP, minY * SCALE_UP, minZ * SCALE_UP);
                coords.push(maxX * SCALE_UP, maxY * SCALE_UP, maxZ * SCALE_UP);
            }
        }

        this.bordersGeometry.setAttribute('position', new BufferAttribute(new Float32Array(borderCoords), 3));
        this.cliffEdgesGeometry.setAttribute('position', new BufferAttribute(new Float32Array(cliffCoords), 3));
    }
}
