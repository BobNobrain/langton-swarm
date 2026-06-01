import { BufferGeometry } from 'three';
import { RawMesh } from '@/lib/planet/RawMesh';
import { PolyMat } from '../PolyMat/PolyMat';
import { circle, ModelConstructor, squareXZ } from './utils';

enum MatType {
    Metal,
    Lights,
}

export const motherMaterial = (factionColor: string) =>
    new PolyMat({
        palette: [
            { color: [0.75, 0.7, 0.7], metalness: 0.4, roughness: 0.5 },
            { color: factionColor, roughness: 0.2, emission: 0.8 },
        ],
        flatShading: true,
    });

const constructor = new ModelConstructor<MatType>(new RawMesh(), MatType.Metal);
const bottom = constructor.spline(squareXZ(-0.4, 0.4, -0.4, 0.4, 0));
const middle = constructor.spline(squareXZ(-0.35, 0.35, -0.35, 0.35, 0.3));
const top = constructor.spline(squareXZ(-0.2, 0.2, -0.2, 0.2, 0.4));
constructor.band(bottom, middle);
constructor.band(middle, top);
constructor.cap(top, 1);

constructor.setMaterial(MatType.Lights);
const lights = constructor.spline(circle({ center: [0, 0.4, 0], normal: [0, 1, 0], nPoints: 6, r: 0.1 }));
constructor.cap(lights, 1);
constructor.adjustCoords(constructor.last(), [0, 0.05, 0]);

export const motherGeometry = new BufferGeometry();
constructor.target.writePositions(motherGeometry);
constructor.target.writeVertexAttributes(motherGeometry, PolyMat.createAttributes);
constructor.target.writeTriangles(motherGeometry);
