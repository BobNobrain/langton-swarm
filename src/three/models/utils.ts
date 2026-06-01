import { combine, cross, normz, type RawColor, type RawVertex, type RawVertexMut } from '@/lib/3d';
import type { RawMesh } from '@/lib/planet/RawMesh';
import { BufferAttribute } from 'three';

type Box = {
    frontBottomLeft: number;
    frontBottomRight: number;
    frontTopLeft: number;
    frontTopRight: number;
    backBottomLeft: number;
    backBottomRight: number;
    backTopLeft: number;
    backTopRight: number;
};
type ContinuousSpline = { readonly start: number; readonly end: number };

export class ModelConstructor<M> {
    constructor(
        public readonly target: RawMesh<number, M>,
        private mat: M,
    ) {}

    setMaterial(material: M) {
        this.mat = material;
    }

    vertexCount() {
        return this.target.vs.length;
    }
    vertex(coords: RawVertex): number {
        return this.target.addVertexWithMaterial(coords, this.mat);
    }

    all(): ContinuousSpline {
        return { start: 0, end: this.target.vs.length };
    }
    last(): number {
        return this.target.vs.length - 1;
    }

    replaceCoords(index: number, coords: RawVertex) {
        this.target.vs[index] = coords;
    }
    adjustCoords(index: number, [dx, dy, dz]: RawVertex) {
        const [x, y, z] = this.target.vs[index];
        this.target.vs[index] = [x + dx, y + dy, z + dz];
    }
    connect(v1: number, v2: number, v3: number) {
        this.target.addTriangle([v1, v2, v3], 0);
    }

    translate(targets: ContinuousSpline, dx: number, dy: number, dz: number) {
        for (let i = targets.start; i < targets.end; i++) {
            const [x, y, z] = this.target.vs[i];
            this.target.vs[i] = [x + dx, y + dy, z + dz];
        }
    }

    quad(bottomLeft: number, bottomRight: number, topLeft: number, topRight: number) {
        this.target.addTriangle([bottomLeft, bottomRight, topLeft], 0);
        this.target.addTriangle([bottomRight, topRight, topLeft], 0);
    }

    quadXY(x1: number, x2: number, y1: number, y2: number, z: number, zDir: -1 | 1 | 0) {
        // bottom left, bottom right, top right, top left
        const a = this.target.addVertexWithMaterial([x1, y1, z], this.mat);
        const b = this.target.addVertexWithMaterial([x2, y1, z], this.mat);
        const c = this.target.addVertexWithMaterial([x2, y2, z], this.mat);
        const d = this.target.addVertexWithMaterial([x1, y2, z], this.mat);

        if (zDir === -1) {
            this.target.addTriangle([a, d, c], 0);
            this.target.addTriangle([a, c, b], 0);
        } else if (zDir === 1) {
            this.target.addTriangle([a, b, c], 0);
            this.target.addTriangle([a, c, d], 0);
        }
    }

    box(
        wx: number,
        h: number,
        wz: number,
        [cx, cy, cz]: RawVertex = [0, 0, 0],
        omitFaces: {
            top?: boolean;
            left?: boolean;
            bottom?: boolean;
            right?: boolean;
            front?: boolean;
            back?: boolean;
        } = {},
    ) {
        const v = this.target.vs.length;
        this.quadXY(-wx / 2 + cx, wx / 2 + cx, -h / 2 + cy, h / 2 + cy, -wz / 2 + cz, omitFaces.back ? 0 : -1); // back
        this.quadXY(-wx / 2 + cx, wx / 2 + cx, -h / 2 + cy, h / 2 + cy, wz / 2 + cz, omitFaces.front ? 0 : 1); // front
        const box: Box = {
            backBottomLeft: v,
            backBottomRight: v + 1,
            backTopRight: v + 2,
            backTopLeft: v + 3,
            frontBottomLeft: v + 4,
            frontBottomRight: v + 5,
            frontTopRight: v + 6,
            frontTopLeft: v + 7,
        };

        if (!omitFaces.top) {
            this.target.addTriangle([box.frontTopLeft, box.frontTopRight, box.backTopRight], 0);
            this.target.addTriangle([box.frontTopLeft, box.backTopRight, box.backTopLeft], 0);
        }
        if (!omitFaces.bottom) {
            this.target.addTriangle([box.frontBottomLeft, box.backBottomRight, box.frontBottomRight], 0);
            this.target.addTriangle([box.frontBottomLeft, box.backBottomLeft, box.backBottomRight], 0);
        }
        if (!omitFaces.left) {
            this.target.addTriangle([box.backBottomLeft, box.frontBottomLeft, box.backTopLeft], 0);
            this.target.addTriangle([box.frontBottomLeft, box.frontTopLeft, box.backTopLeft], 0);
        }
        if (!omitFaces.right) {
            this.target.addTriangle([box.backBottomRight, box.backTopRight, box.frontBottomRight], 0);
            this.target.addTriangle([box.frontBottomRight, box.backTopRight, box.frontTopRight], 0);
        }

        return box;
    }

    spline(spline: RawVertex[]): ContinuousSpline {
        const result: ContinuousSpline = { start: this.target.vs.length, end: this.target.vs.length + spline.length };

        for (const v of spline) {
            this.target.addVertexWithMaterial(v, this.mat);
        }

        return result;
    }

    band(bottom: ContinuousSpline, top: ContinuousSpline) {
        const n = bottom.end - bottom.start;

        for (let i = 0; i < n - 1; i++) {
            this.quad(bottom.start + i, bottom.start + i + 1, top.start + i, top.start + i + 1);
        }

        this.quad(bottom.end - 1, bottom.start, top.end - 1, top.start);
    }

    cap(circumference: ContinuousSpline, dir: -1 | 1) {
        const centerCoords: RawVertexMut = [0, 0, 0];
        for (let vi = circumference.start; vi < circumference.end; vi++) {
            for (let i = 0; i < centerCoords.length; i++) {
                centerCoords[i] += this.target.vs[vi][i];
            }
        }

        const scaleDown = 1 / (circumference.end - circumference.start);
        for (let i = 0; i < centerCoords.length; i++) {
            centerCoords[i] *= scaleDown;
        }

        const center = this.target.addVertexWithMaterial(centerCoords, this.mat);
        for (let i = circumference.start; i < circumference.end - 1; i++) {
            this.target.addTriangle([center, i, i + 1], 0);
        }
        this.target.addTriangle([center, circumference.end - 1, circumference.start], 0);

        if (dir === -1) {
            const nTriangles = circumference.end - circumference.start;
            for (let i = 0; i < nTriangles; i++) {
                const ti = this.target.triangles.length - i - 1;
                const triangle = this.target.triangles[ti];
                const t1 = triangle[1];
                const t2 = triangle[2];
                triangle[1] = t2;
                triangle[2] = t1;
            }
        }
    }
}

export function circle({
    center = [0, 0, 0],
    r,
    normal,
    nPoints,
}: {
    center?: RawVertex;
    r: number;
    normal: RawVertex;
    nPoints: number;
}): RawVertex[] {
    const result: RawVertex[] = new Array(nPoints);
    const [cx, cy, cz] = center;

    const shifted: RawVertexMut = [...normal];
    shifted[0] += cz;
    shifted[1] += cx;
    shifted[2] += cy;
    const tangentA = normz(cross(normal, shifted));
    const tangentB = cross(normal, tangentA);

    for (let i = 0; i < nPoints; i++) {
        const angle = (i / nPoints) * 2 * Math.PI;
        const da = Math.cos(angle) * r;
        const db = Math.sin(angle) * r;
        const [dx, dy, dz] = combine(da, tangentA, db, tangentB);

        result[i] = [cx + dx, cy + dy, cz + dz];
    }

    return result;
}
export function squareXZ(x1: number, x2: number, z1: number, z2: number, y: number): RawVertex[] {
    return [
        [x1, y, z1],
        [x1, y, z2],
        [x2, y, z2],
        [x2, y, z1],
    ];
}

export function unitModelAttribs(colors: RawColor[]) {
    return { color: new BufferAttribute(new Float32Array(colors.flat()), 3) };
}
