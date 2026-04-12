import { BufferAttribute, type BufferGeometry } from 'three';
import type { RawVertex, RawColor, RawFace } from '../3d';

export class RawMesh<NId extends number> {
    readonly vs: RawVertex[] = [];
    readonly triangles: RawFace[] = [];
    readonly colors: RawColor[] = [];
    readonly nodes: NId[] = [];

    addVertexColored(coords: RawVertex, color: RawColor) {
        this.vs.push(coords);
        this.colors.push(color);
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
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.vs.flat()), 3));
        if (this.triangles.length) {
            geometry.setIndex(this.triangles.flat());
            geometry.computeVertexNormals();
        }

        if (this.colors.length) {
            const colorsAttr = new BufferAttribute(new Float32Array(this.colors.flat()), 3);
            geometry.setAttribute('color', colorsAttr);
        }

        geometry.userData.sourceNodes = this.nodes;
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
        this.colors.length = 0;
        this.nodes.length = 0;
    }
}
