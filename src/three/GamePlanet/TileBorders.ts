import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, type Object3D } from 'three';
import type { NodeId } from '@/game';
import type { RawMesh } from '@/lib/planet/RawMesh';

const bordersMat = new LineBasicMaterial({ color: 0xffffff, opacity: 0.2, linewidth: 2, transparent: true });
const SCALE_UP = 1.001;

export class TileBorders {
    private geometry = new BufferGeometry();
    private lines = new LineSegments(this.geometry, bordersMat);

    constructor(
        private meshData: RawMesh<NodeId>,
        private nRealVerticies: number,
    ) {
        this.lines.name = 'tileBorders';
        this.lines.renderOrder = -1;

        this.rerender();
    }

    obj(): Object3D {
        return this.lines;
    }

    rerender() {
        const coords: number[] = [];
        const added = new Map<number, Set<number>>();
        const edges: [number, number][] = [];

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
                const min = Math.min(a, b);
                const max = Math.max(a, b);

                const alreadyIn = added.getOrInsert(min, new Set());
                if (alreadyIn.has(max)) {
                    continue;
                }

                alreadyIn.add(max);

                const [minX, minY, minZ] = this.meshData.vs[min];
                const [maxX, maxY, maxZ] = this.meshData.vs[max];
                coords.push(minX * SCALE_UP, minY * SCALE_UP, minZ * SCALE_UP);
                coords.push(maxX * SCALE_UP, maxY * SCALE_UP, maxZ * SCALE_UP);
            }
        }

        this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(coords), 3));
    }
}
