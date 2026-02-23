import { BufferAttribute, type BufferGeometry } from 'three';
import type { RawVertex } from './3d';
import type { MaterialData, MeshBuilder } from './MeshBuilder';

export class MeshPainter<TileData> {
    private palette: MaterialData[] = [];
    private tileData: MeshFaceData<TileData>[] = [];

    constructor(graphMesh: MeshBuilder, initData: (vi: number, builder: MeshBuilder) => TileData) {
        const size = graphMesh.size();

        for (let vi = 0; vi < size.verticies; vi++) {
            const coords = graphMesh.coords(vi);
            this.tileData.push({
                pos: coords,
                colorIndex: 0,
                data: initData(vi, graphMesh),
            });
        }
    }

    size(): number {
        return this.tileData.length;
    }

    setPalette(palette: MaterialData[]) {
        this.palette = palette;
    }

    getTile(tileIndex: number): Readonly<MeshFaceData<TileData>> {
        return this.tileData[tileIndex];
    }

    setTileColor(tileIndex: number, colorIndex: number) {
        this.tileData[tileIndex].colorIndex = colorIndex;
    }
    setTileData(tileIndex: number, data: TileData): this {
        this.tileData[tileIndex].data = data;
        return this;
    }

    paintGraph(mesh: BufferGeometry) {
        const colors = this.tileData.map((td) => this.palette[td.colorIndex].reflective).flat();
        mesh.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));

        if (this.palette.some((c) => c.roughness !== undefined)) {
            const roughnessValues = this.tileData.map((td) => this.palette[td.colorIndex].roughness ?? 1);
            mesh.setAttribute('roughness', new BufferAttribute(new Float32Array(roughnessValues), 3));
        }
    }

    paintSurface(builder: MeshBuilder) {
        builder.paintFaces(
            this.palette,
            this.tileData.map((td) => td.colorIndex),
        );
    }
}

export type MeshFaceData<T> = {
    pos: RawVertex;
    colorIndex: number;
    data: T;
};
