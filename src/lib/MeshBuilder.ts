import * as T from 'three';
import { calcCenter, fullAngle, normz, project, type RawVertex } from './3d';

export type MeshBuilderSize = {
    verticies: number;
    faces: number;
};

export type RawFace = [number, number, number];

export type RawColor = [number, number, number];

export type MaterialData = {
    reflective: RawColor;
    roughness?: number;
};

export type Poly = number[];

export class MeshBuilder {
    private verticies: RawVertex[] = [];
    private materials: MaterialData[] = [];
    private hasRoughnessAttribute = false;
    private faces: Poly[] = [];
    private duplicatesToOriginals = new Map<number, number>();

    size(): MeshBuilderSize {
        return {
            verticies: this.verticies.length,
            faces: this.faces.length,
        };
    }

    clone(): MeshBuilder {
        const clone = new MeshBuilder();
        clone.verticies = this.verticies.slice();
        clone.materials = this.materials.slice();
        clone.hasRoughnessAttribute = this.hasRoughnessAttribute;
        clone.faces = this.faces.slice();
        clone.duplicatesToOriginals = new Map(this.duplicatesToOriginals.entries());
        return clone;
    }

    add(x: number, y: number, z: number): number {
        const i = this.verticies.length;
        this.verticies.push([x, y, z]);
        return i;
    }
    addIfNotClose(x: number, y: number, z: number): number {
        const i = this.lookup(x, y, z);
        return i === -1 ? this.add(x, y, z) : i;
    }
    addMany(vs: RawVertex[]): number {
        const i = this.verticies.length;
        this.verticies.push(...vs);
        return i;
    }

    coords(vertexIndex: number): RawVertex {
        return this.verticies[vertexIndex];
    }
    setCoords(vertexIndex: number, coords: RawVertex) {
        this.verticies[vertexIndex] = coords;
    }
    getAllCoords(): readonly RawVertex[] {
        return this.verticies;
    }

    mapVerticies(f: (v: RawVertex, i: number) => RawVertex) {
        this.verticies = this.verticies.map(f);
    }

    calculateConnectionMap(): Set<number>[] {
        const result = this.verticies.map(() => new Set<number>());

        for (const face of this.faces) {
            result[face[0]].add(face[face.length - 1]);
            result[face[face.length - 1]].add(face[0]);

            for (let fvi = 1; fvi < face.length - 1; fvi++) {
                result[face[fvi]].add(face[fvi - 1]);
                result[face[fvi - 1]].add(face[fvi]);

                result[face[fvi]].add(face[fvi + 1]);
                result[face[fvi + 1]].add(face[fvi]);
            }
        }

        return result;
    }

    private eps = 1e-4;
    setEps(eps: number) {
        this.eps = eps;
    }
    lookup(x: number, y: number, z: number): number {
        const target: RawVertex = [x, y, z];
        for (let i = 0; i < this.verticies.length; i++) {
            const v = this.verticies[i];
            if (areClose(target, v, this.eps)) {
                return i;
            }
        }
        return -1;
    }

    assembleVerticies(vs: number[]): number {
        const i = this.faces.length;
        this.faces.push(vs);
        return i;
    }

    face(faceIndex: number): Poly {
        return this.faces[faceIndex];
    }
    getAllFaces(): readonly Poly[] {
        return this.faces;
    }
    findConnectedFaces(vertexIndicies: number[]): number[] {
        const result: number[] = [];
        for (let f = 0; f < this.faces.length; f++) {
            const face = this.faces[f];
            if (vertexIndicies.every((vi) => face.includes(vi))) {
                result.push(f);
            }
        }
        return result;
    }
    replaceFace(faceIndex: number, vs: number[]) {
        this.faces[faceIndex] = vs;
    }

    subdivide(f: (face: Poly, b: MeshBuilder) => Poly[]) {
        const newFaces: Poly[] = [];
        for (const face of this.faces) {
            const subs = f(face, this);
            newFaces.push(...subs);
        }
        this.faces = newFaces;
    }

    triangulate() {
        const triangulatedFaces: RawFace[] = [];
        for (let fi = 0; fi < this.faces.length; fi++) {
            const poly = this.faces[fi];
            if (poly.length === 3) {
                triangulatedFaces.push(poly as RawFace);
                continue;
            }

            const triangles = triangulatePoly(poly);
            for (const t of triangles) {
                triangulatedFaces.push(t);
            }
        }
        this.faces = triangulatedFaces;
    }

    paintFaces(palette: MaterialData[], faceColors: number[]) {
        const vnOriginal = this.verticies.length;
        this.materials = new Array<MaterialData>(vnOriginal);
        this.hasRoughnessAttribute = palette.some((m) => m.roughness !== undefined);

        // duplicates[vi][ci] -> vi with color palette[ci] (or undefined, if none)
        const duplicates = new Array<number[]>(vnOriginal);

        for (let fi = 0; fi < this.faces.length; fi++) {
            const ci = faceColors[fi];
            const color = palette[ci];
            const face = this.faces[fi];

            for (let fvi = 0; fvi < face.length; fvi++) {
                const vi = face[fvi];
                if (!duplicates[vi]) {
                    duplicates[vi] = new Array<number>(palette.length);
                    duplicates[vi][ci] = vi;
                    this.materials[vi] = color;
                    continue;
                }

                if (!duplicates[vi][ci]) {
                    const dupedVi = this.add(...this.verticies[vi]);
                    duplicates[vi][ci] = dupedVi;
                    this.duplicatesToOriginals.set(dupedVi, vi);
                    this.materials[dupedVi] = color;
                }

                face[fvi] = duplicates[vi][ci];
            }
        }
    }
    paintVertex(vi: number, mat: MaterialData) {
        this.materials[vi] = mat;
    }
    getVertexMaterial(vi: number): MaterialData | undefined {
        return this.materials[vi];
    }

    /** After mesh faces have been painted, this method will map duplicated vertex index back to original one */
    getOriginalVertexIndex(dvi: number) {
        return this.duplicatesToOriginals.get(dvi) ?? dvi;
    }

    buildTriangulated(triangulator: (vs: number[], builder: MeshBuilder) => RawFace[] = triangulatePoly): {
        geometry: T.BufferGeometry;
        faceIndexMap: Record<number, number>;
    } {
        const triangleFaceIndicies: Record<number, number> = {};
        const faces: RawFace[] = [];
        for (let fi = 0; fi < this.faces.length; fi++) {
            const poly = this.faces[fi];
            if (poly.length === 3) {
                triangleFaceIndicies[faces.length] = fi;
                faces.push(poly as RawFace);
                continue;
            }

            const triangles = triangulator(poly, this);
            for (const t of triangles) {
                triangleFaceIndicies[faces.length] = fi;
                faces.push(t);
            }
        }

        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(this.verticies.flat()), 3));
        geometry.setIndex(faces.flat());
        geometry.computeVertexNormals();

        if (this.materials.length) {
            const colorsAttr = new T.BufferAttribute(
                new Float32Array(this.materials.map((m) => m.reflective).flat()),
                3,
            );
            geometry.setAttribute('color', colorsAttr);
            geometry.setAttribute('emissive', colorsAttr.clone());

            if (this.hasRoughnessAttribute) {
                geometry.setAttribute(
                    'roughness',
                    new T.BufferAttribute(new Float32Array(this.materials.map((m) => m.roughness ?? 1)), 1),
                );
            }
        }

        return { geometry, faceIndexMap: triangleFaceIndicies };
    }
}

function triangulatePoly([anchor, ...vs]: number[]): RawFace[] {
    const result: RawFace[] = [];
    for (let i = 1; i < vs.length; i++) {
        result.push([anchor, vs[i - 1], vs[i]]);
    }
    return result;
}

function areClose(a: RawVertex, b: RawVertex, eps: number): boolean {
    const ds = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    for (const d of ds) {
        if (Math.abs(d) > eps) {
            return false;
        }
    }
    return true;
}

export function getInvertedMesh(source: MeshBuilder): MeshBuilder {
    const inverted = new MeshBuilder();
    const size = source.size();

    for (let fi = 0; fi < size.faces; fi++) {
        const face = source.face(fi);
        const faceCenter = normz(calcCenter(face.map((vi) => source.coords(vi))));
        inverted.add(...faceCenter);
    }

    for (let vi = 0; vi < size.verticies; vi++) {
        const faces = source.findConnectedFaces([vi]);
        const v = source.coords(vi);
        const planeNormal = normz(v);

        const normalizedProjections = faces.map((fi) => {
            const faceCenter = inverted.coords(fi);
            const projection = project(faceCenter, planeNormal);
            return normz(projection);
        });

        const axis = normalizedProjections[0];

        const withAngles = faces.map((fi, i) => {
            if (i === 0) {
                return { fi, angle: 0, projection: axis };
            }

            const projection = normalizedProjections[i];
            const angle = fullAngle(projection, axis, planeNormal);

            return { fi, angle, projection };
        });
        withAngles.sort((a, b) => a.angle - b.angle);

        inverted.assembleVerticies(withAngles.map(({ fi }) => fi));
    }

    return inverted;
}
