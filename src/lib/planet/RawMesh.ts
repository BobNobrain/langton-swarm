import { BufferAttribute, type BufferGeometry } from 'three';
import type { RawVertex, RawColor, RawFace } from '../3d';

export type RawAttribute =
    | {
          name: string;
          size: 1;
          values: number[];
      }
    | {
          name: string;
          size: 3;
          values: RawColor[];
      };

export class RawMesh<NId extends number, Material = void> {
    readonly vs: RawVertex[] = [];
    readonly triangles: RawFace[] = [];
    readonly materials: Material[] = [];
    readonly nodes: NId[] = [];

    readonly attributes: Record<string, RawAttribute> = {};

    addVertexWithMaterial(coords: RawVertex, material: Material) {
        this.vs.push(coords);
        this.materials.push(material);
        return this.vs.length - 1;
    }
    addVertexUncolored(coords: RawVertex) {
        this.vs.push(coords);
        return this.vs.length - 1;
    }

    resetTriangles() {
        this.triangles.length = 0;
        this.nodes.length = 0;
    }

    addTriangle(triangle: RawFace, source: NId) {
        this.triangles.push(triangle);
        this.nodes.push(source);
    }

    getNodeByTriangleIndex(triangleIndex: number): NId {
        return this.nodes[triangleIndex];
    }

    writeToGeometry(geometry: BufferGeometry) {
        this.writePositions(geometry);
        this.writeTriangles(geometry);
    }

    writePositions(geometry: BufferGeometry) {
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.vs.flat()), 3));
    }
    writeTriangles(geometry: BufferGeometry) {
        if (this.triangles.length) {
            geometry.setIndex(this.triangles.flat());
            geometry.computeVertexNormals();
        }
    }
    writeVertexAttributes(
        geometry: BufferGeometry,
        attributeCreator: (ms: Material[]) => Record<string, BufferAttribute>,
    ) {
        const attrs = attributeCreator(this.materials);
        for (const [name, attr] of Object.entries(attrs)) {
            geometry.setAttribute(name, attr);
        }
    }

    scale(factor: number) {
        for (let i = 0; i < this.vs.length; i++) {
            const [x, y, z] = this.vs[i];
            this.vs[i] = [x * factor, y * factor, z * factor];
        }
    }

    clear() {
        this.vs.length = 0;
        this.triangles.length = 0;
        this.materials.length = 0;
        this.nodes.length = 0;
    }
}
