import type { GameWorld, NodeId } from '@/game';
import { PlanetSurface } from '@/lib/planet/PlanetSurface';
import { RawMesh } from '@/lib/planet/RawMesh';
import { PALETTE, type SurfaceTileMaterial, createAttributes } from './colors';
import { BufferGeometry, Mesh, type Object3D } from 'three';
import { PlanetMaterial } from './planetMat';
import { onBeforeRepaint } from '../hooks/handlers';

export class SurfaceMesh {
    readonly meshData: RawMesh<NodeId, SurfaceTileMaterial>;
    readonly surface: PlanetSurface<NodeId>;
    private surfaceMesh: Mesh;
    private surfaceGeom: BufferGeometry;
    private surfaceMaterial = new PlanetMaterial();

    constructor(world: Pick<GameWorld, 'landscape' | 'graph' | 'radius' | 'terraIncognita'>) {
        const surface = PlanetSurface.fromGraph<NodeId>(world.graph, world.radius);
        surface.applyLandscape(world.landscape);
        surface.fillVertexIndex();

        const meshData = new RawMesh<NodeId, SurfaceTileMaterial>();
        surface.renderVerticies(meshData, PALETTE);

        const geom = new BufferGeometry();
        meshData.writePositions(geom);
        meshData.writeVertexAttributes(geom, createAttributes);

        const mesh = new Mesh(geom, this.surfaceMaterial);
        mesh.name = 'planetMesh';

        this.surface = surface;
        this.meshData = meshData;
        this.surfaceGeom = geom;
        this.surfaceMesh = mesh;

        this.rerender(world);

        onBeforeRepaint(() => this.surfaceMaterial.animate());
    }

    rerender(world: Pick<GameWorld, 'terraIncognita'>) {
        this.surface.renderTiles(this.meshData, world.terraIncognita);
        this.meshData.writeTriangles(this.surfaceGeom);
    }

    obj(): Object3D {
        return this.surfaceMesh;
    }
}
