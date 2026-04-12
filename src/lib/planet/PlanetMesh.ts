import { avgSize, calcCenter, fullAngle, normz, project, scale, size, type RawVertex, type RawColor } from '../3d';
import type { ID } from '../ids';
import { RawMesh } from './RawMesh';

type ProjectionId = ID<number, 'ProjectionId'>;
type VertexId = ID<number, 'VertexId'>;

type GraphNode<NId extends number> = {
    coords: RawVertex;
    connections: Set<NId>;
};

type Tile<NId extends number> = {
    node: NId;
    vs: VertexId[];
    materialIndex: number;
    elevation: number;
};

type Vertex<NId extends number> = {
    projection: ProjectionId;
    materialIndex: number;
    elevation: number;
    tiles: Set<NId>;
};

type CliffWall = {
    bottom: [VertexId, VertexId];
    top: [VertexId, VertexId];
};

export class PlanetSurface<NId extends number> {
    private graph: GraphNode<NId>[] = [];
    /** NId -> Tile */
    private tiles: Tile<NId>[] = [];
    /** ProjectionId -> coords (at elevation 0) */
    private projections: RawVertex[] = [];
    /** VertexId -> Vertex data */
    private verticies: Vertex<NId>[] = [];
    /** ProjectionId -> VertexId[] */
    private projectionInstances: VertexId[][] = [];

    static fromGraph<NId extends number>(
        graph: {
            coords: { x: number; y: number; z: number };
            connections: Set<number>;
            elevation: number | undefined;
            materialIndex: number;
        }[],
        faces?: number[][],
    ): PlanetSurface<NId> {
        const result = new PlanetSurface<NId>();
        result.graph = graph.map(({ connections, coords: { x, y, z } }) => ({
            coords: [x, y, z],
            connections: new Set<NId>(connections as Set<NId>),
        }));

        result.buildFlatTiles(faces as never);

        for (let ni = 0 as NId; ni < graph.length; ni++) {
            const node = graph[ni];
            result.paintTile(ni, node.materialIndex);
            if (node.elevation !== undefined && node.elevation !== 0) {
                result.elevateTile(ni, node.elevation);
            }
        }

        result.cleanUnusedVerticies();

        return result;
    }

    getTiles(): readonly Tile<NId>[] {
        return this.tiles;
    }
    getTile(id: NId): Tile<NId> {
        return this.tiles[id];
    }
    nTiles() {
        return this.tiles.length;
    }
    nRealVerticies() {
        return this.verticies.length;
    }
    getVertexCoords(vi: VertexId): RawVertex {
        const v = this.verticies[vi];
        const base = this.projections[v.projection];
        if (v.elevation === 0) {
            return base;
        }

        const [x, y, z] = base;
        const r = size(base);
        const scale = (r + v.elevation) / r;
        return [x * scale, y * scale, z * scale];
    }

    buildRamp(from: NId, to: NId) {}

    renderVerticies(result: RawMesh<NId>, palette: RawColor[]) {
        for (let vi = 0 as VertexId; vi < this.verticies.length; vi++) {
            const v = this.verticies[vi];
            result.addVertexColored(this.getVertexCoords(vi), palette[v.materialIndex]);
        }

        for (let tileId = 0 as NId; tileId < this.tiles.length; tileId++) {
            const tile = this.tiles[tileId];
            const middleCoords = this.getMiddleCoords(tileId);
            result.addVertexColored(middleCoords, palette[tile.materialIndex]);
        }
    }

    renderTiles(mesh: RawMesh<NId>, invisible: Set<NId>) {
        mesh.resetTriangles();

        for (let tileId = 0 as NId; tileId < this.tiles.length; tileId++) {
            if (invisible.has(tileId)) {
                continue;
            }

            const tile = this.tiles[tileId];
            const poly = tile.vs;

            const middle = this.verticies.length + tileId;
            for (let i = 0; i < poly.length - 1; i++) {
                mesh.addTriangle([middle, poly[i], poly[i + 1]], tileId);
            }
            mesh.addTriangle([middle, poly[poly.length - 1], poly[0]], tileId);
        }

        for (let tileId = 0 as NId; tileId < this.tiles.length; tileId++) {
            if (invisible.has(tileId)) {
                continue;
            }

            const walls = this.getWalls(tileId);
            for (const { top, bottom } of walls) {
                // TODO: figure out proper normals? (double sided rendering works for now)
                mesh.addTriangle([top[0], top[1], bottom[0]], tileId);
                mesh.addTriangle([top[1], bottom[1], bottom[0]], tileId);
            }
        }
    }

    private buildFlatTiles(originalFaces: [NId, NId, NId][] = []) {
        // const originalFaces: [NId, NId, NId][] = [];
        if (!originalFaces.length) {
            // TODO: this algorithm does not work!
            // for whatever reason, it generates triple the amount of faces
            for (let vi = 0 as NId; vi < this.graph.length; vi++) {
                const connecteds = Array.from(this.graph[vi].connections);

                for (let j = 0; j < connecteds.length; j++) {
                    const vj = connecteds[j];
                    for (let k = 0; k < connecteds.length; k++) {
                        const vk = connecteds[k];
                        if (j === k || vj >= vk) {
                            continue;
                        }

                        const areConnected = this.graph[vj].connections.has(vk);

                        if (areConnected) {
                            originalFaces.push([vi, vj, vk]);
                        }
                    }
                }
            }
        }

        this.projections.length = 0;
        this.verticies.length = 0;
        for (let fi = 0 as ProjectionId; fi < originalFaces.length; fi++) {
            const face = originalFaces[fi];
            const faceVertexCoords = face.map((vi) => this.graph[vi].coords);
            const faceCenter = scale(avgSize(faceVertexCoords))(normz(calcCenter(faceVertexCoords)));

            this.projections.push(faceCenter);
            this.instantiateVertex(fi, 0, 0);
        }

        for (let ni = 0 as NId; ni < this.graph.length; ni++) {
            const connectedFaceIndicies = new Set<VertexId>();
            for (let fi = 0 as VertexId; fi < originalFaces.length; fi++) {
                if (originalFaces[fi].includes(ni)) {
                    connectedFaceIndicies.add(fi);
                }
            }
            const v = this.graph[ni].coords;
            const planeNormal = normz(v);

            const connectedFaceIndiciesList = Array.from(connectedFaceIndicies);
            const normalizedProjections = connectedFaceIndiciesList.map((fi) => {
                const faceCenter = this.projections[fi];
                const projection = project(faceCenter, planeNormal);
                return normz(projection);
            });

            const axis = normalizedProjections[0];

            const withAngles = connectedFaceIndiciesList.map((fi, i) => {
                if (i === 0) {
                    return { fi, angle: 0, projection: axis };
                }

                const projection = normalizedProjections[i];
                const angle = fullAngle(projection, axis, planeNormal);

                return { fi, angle, projection };
            });
            withAngles.sort((a, b) => a.angle - b.angle);

            this.addTile(
                ni,
                withAngles.map(({ fi }) => fi),
            );
        }
    }

    private paintTile(tileId: NId, materialIndex: number) {
        const tile = this.tiles[tileId];
        if (!tile || tile.materialIndex === materialIndex) {
            return;
        }

        tile.materialIndex = materialIndex;

        for (const viOld of tile.vs) {
            const vOld = this.verticies[viOld];
            if (vOld.materialIndex === materialIndex) {
                continue;
            }

            let viNew = this.findVertex(vOld.projection, materialIndex, tile.elevation);
            if (viNew === null) {
                viNew = this.instantiateVertex(vOld.projection, materialIndex, tile.elevation ?? vOld.elevation);
            }

            this.swapTileVertex(tileId, viOld, viNew);
        }
    }

    private elevateTile(tileId: NId, elevation: number) {
        const tile = this.tiles[tileId];
        if (!tile || tile.elevation === elevation) {
            return;
        }

        tile.elevation = elevation;
        for (const viOld of tile.vs) {
            const vOld = this.verticies[viOld];
            if (vOld.elevation === elevation) {
                continue;
            }

            let viNew = this.findVertex(vOld.projection, tile.materialIndex, elevation);
            if (viNew === null) {
                viNew = this.instantiateVertex(vOld.projection, tile.materialIndex, elevation);
            }

            this.swapTileVertex(tileId, viOld, viNew);
        }
    }

    private cleanUnusedVerticies() {
        // TODO
    }

    private addTile(tileId: NId, vis: VertexId[]) {
        this.tiles[tileId] = { node: tileId, vs: vis, materialIndex: 0, elevation: 0 };
        for (const vi of vis) {
            this.verticies[vi].tiles.add(tileId);
        }
    }
    private swapTileVertex(tileId: NId, viOld: VertexId, viNew: VertexId) {
        const tile = this.tiles[tileId];
        const i = tile.vs.indexOf(viOld);
        if (i === -1) {
            throw new Error(
                `cannot find viOld (tileId=${tileId}, viOld=${viOld}, viNew=${viNew}, vs=[${tile.vs.join(', ')}])`,
            );
        }

        tile.vs[i] = viNew;
        this.verticies[viOld].tiles.delete(tileId);
        this.verticies[viNew].tiles.add(tileId);
    }

    private instantiateVertex(base: ProjectionId, materialIndex: number, elevation: number): VertexId {
        const id = this.verticies.length as VertexId;
        this.verticies.push({ projection: base, materialIndex, elevation, tiles: new Set() });

        if (!this.projectionInstances[base]) {
            this.projectionInstances[base] = [];
        }

        this.projectionInstances[base].push(id);
        return id;
    }

    private findVertex(base: ProjectionId, materialIndex: number, elevation: number | undefined): VertexId | null {
        const vs = this.projectionInstances[base];

        for (const vi of vs) {
            const v = this.verticies[vi];

            if (v.materialIndex !== materialIndex) {
                continue;
            }

            if (elevation !== undefined && v.elevation !== elevation) {
                continue;
            }

            return vi;
        }

        return null;
    }

    private getMiddleCoords(tileId: NId): RawVertex {
        const tile = this.tiles[tileId];
        const vs = tile.vs;
        let rx = 0,
            ry = 0,
            rz = 0,
            size = 0;

        for (const vi of vs) {
            const [x, y, z] = this.getVertexCoords(vi);
            rx += x;
            ry += y;
            rz += z;
            size += Math.sqrt(x * x + y * y + z * z);
        }

        const [nx, ny, nz] = normz([rx, ry, rz]);
        const factor = size / vs.length;
        return [nx * factor, ny * factor, nz * factor];
    }

    private getWalls(ti: NId) {
        const tile = this.tiles[ti];
        const tilePIs = new Map<ProjectionId, VertexId>();

        const walls: CliffWall[] = [];

        for (const vi of tile.vs) {
            tilePIs.set(this.verticies[vi].projection, vi);
        }

        for (const nti of this.graph[ti].connections) {
            const nt = this.tiles[nti];
            if (tile.elevation <= nt.elevation) {
                continue;
            }

            const ntPIs = new Map<ProjectionId, VertexId>();
            for (const vi of nt.vs) {
                const pi = this.verticies[vi].projection;
                if (!tilePIs.has(pi)) {
                    continue;
                }

                ntPIs.set(pi, vi);
            }

            if (ntPIs.size !== 2) {
                // console.error('expected to have 2 common verticies', {
                //     ntPIs,
                //     tilePIs,
                //     ti,
                //     nti,
                //     ntilevs: tile.vs.length,
                // });
                // throw new Error('expected to have 2 common verticies, got ' + ntPIs.size + ' ' + nti + ' ' + ti);
                continue;
            }

            const [[pi1, vib1], [pi2, vib2]] = Array.from(ntPIs);
            const vit1 = tilePIs.get(pi1)!;
            const vit2 = tilePIs.get(pi2)!;

            walls.push({ bottom: [vib1, vib2], top: [vit1, vit2] });
        }

        return walls;
    }
}
