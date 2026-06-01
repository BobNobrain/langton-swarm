import { BufferGeometry } from 'three';
import type { RawVertex } from '@/lib/3d';
import { RawMesh } from '@/lib/planet/RawMesh';
import { PolyMat } from '../PolyMat/PolyMat';
import { circle, ModelConstructor } from './utils';

enum MatType {
    Metal,
    Wheels,
    Lights,
}

export const roverMaterial = (factionColor: string) =>
    new PolyMat({
        palette: [
            {
                color: [0.7, 0.75, 0.8],
                roughness: 0.5,
                metalness: 0.8,
            },
            {
                color: [0.25, 0.25, 0.3],
                roughness: 0.8,
                metalness: 0.4,
            },
            {
                color: factionColor,
                roughness: 0.2,
                metalness: 0.0,
                emission: 0.8,
            },
        ],
        flatShading: true,
    });

const constructor = new ModelConstructor<MatType>(new RawMesh(), MatType.Metal);
const roverBox = constructor.box(0.15, 0.06, 0.3, [0, 0.04, 0], { bottom: true });
constructor.adjustCoords(roverBox.frontTopLeft, [0, -0.03, 0]);
constructor.adjustCoords(roverBox.frontTopRight, [0, -0.03, 0]);
constructor.adjustCoords(roverBox.backTopLeft, [0, 0, 0.05]);
constructor.adjustCoords(roverBox.backTopRight, [0, 0, 0.05]);

constructor.setMaterial(MatType.Wheels);
for (const wheelCenter of [
    [-0.1, 0.03, 0.1],
    [0.1, 0.03, 0.1],
    [-0.1, 0.03, -0.1],
    [0.1, 0.03, -0.1],
] as RawVertex[]) {
    const xOutDir = Math.sign(wheelCenter[0]);
    const wheelSpline = circle({ center: wheelCenter, normal: [xOutDir, 0, 0], nPoints: 16, r: 0.03 });
    const outer = constructor.spline(wheelSpline);
    const inner = constructor.spline(wheelSpline);
    constructor.translate(inner, xOutDir * -0.02, 0, 0);
    constructor.translate(outer, xOutDir * 0.01, 0, 0);
    constructor.band(inner, outer);
    constructor.cap(inner, -1);
    constructor.cap(outer, 1);
}

constructor.setMaterial(MatType.Lights);
const lights = constructor.spline(
    circle({
        center: [0, 0.06, -0.02],
        normal: [0, 1, 0],
        nPoints: 6,
        r: 0.05,
    }),
);
constructor.cap(lights, 1);
constructor.adjustCoords(constructor.last(), [0, 0.01, 0]);

export const roverGeometry = new BufferGeometry();
constructor.target.writePositions(roverGeometry);
constructor.target.writeVertexAttributes(roverGeometry, PolyMat.createAttributes);
constructor.target.writeTriangles(roverGeometry);
