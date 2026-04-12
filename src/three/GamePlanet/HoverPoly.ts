import type { NodeId } from '@/game';
import type { PlanetSurface } from '@/lib/planet/PlanetMesh';
import { RawMesh } from '@/lib/planet/RawMesh';
import { BufferGeometry, Mesh, MeshBasicMaterial, type Object3D } from 'three';
import { onBeforeRepaint } from '../hooks/handlers';

const hoverMat = new MeshBasicMaterial({ color: 0x67b740, transparent: true, opacity: 0.4 });
const SCALE_UP = 1.001;

export class HoverPoly {
    private geometry = new BufferGeometry();
    private poly = new Mesh(this.geometry, hoverMat);
    private hoverMeshData = new RawMesh<NodeId>();
    private renderedDataFor = -1 as NodeId;

    constructor(
        surfaceMesh: Object3D,
        surface: PlanetSurface<NodeId>,
        meshData: RawMesh<NodeId>,
        onTileHover: (tile: null | NodeId) => void,
    ) {
        this.poly.renderOrder = -1;
        this.poly.name = 'hoveredTilePoly';

        onBeforeRepaint(({ cursor }) => {
            this.poly.visible = false;
            onTileHover(null);

            if (!cursor) {
                return;
            }

            const [closestIntersection] = cursor.intersectObject(surfaceMesh);
            const triangleIndex = closestIntersection?.faceIndex ?? -1;
            const tileIndex = triangleIndex < 0 ? -1 : meshData.getNodeByTriangleIndex(triangleIndex);
            if (tileIndex === -1) {
                return;
            }

            onTileHover(tileIndex);
            this.poly.visible = true;

            if (tileIndex === this.renderedDataFor) {
                return;
            }

            this.hoverMeshData.clear();
            const vs = surface.getTile(tileIndex).vs;
            for (const vi of vs) {
                const [x, y, z] = surface.getVertexCoords(vi);
                this.hoverMeshData.addVertexUncolored([x * SCALE_UP, y * SCALE_UP, z * SCALE_UP]);
            }

            const [middleX, middleY, middleZ] = meshData.vs[surface.nRealVerticies() + tileIndex];
            this.hoverMeshData.addVertexUncolored([middleX * SCALE_UP, middleY * SCALE_UP, middleZ * SCALE_UP]);

            for (let i = 1; i < vs.length; i++) {
                this.hoverMeshData.addTriangle([i - 1, i, vs.length], tileIndex);
            }
            this.hoverMeshData.addTriangle([vs.length - 1, 0, vs.length], tileIndex);

            this.hoverMeshData.scale(SCALE_UP);
            this.hoverMeshData.writeToGeometry(this.geometry);
            this.renderedDataFor = tileIndex;
        });
    }

    obj(): Object3D {
        return this.poly;
    }

    rerender() {}
}
