import { BufferGeometry } from 'three';
import { RawMesh } from '@/lib/planet/RawMesh';
import { PolyMat } from '../PolyMat/PolyMat';
import { circle, ModelConstructor, squareXZ } from './utils';

enum MatType {
    Metal,
    Lights,
}

export const miningTowerMaterial = (factionColor: string) =>
    new PolyMat({
        palette: [
            { color: [0.75, 0.7, 0.7], metalness: 0.4, roughness: 0.5 },
            { color: factionColor, roughness: 0.2, emission: 0.8 },
        ],
        flatShading: true,
    });

const constructor = new ModelConstructor<MatType>(new RawMesh(), MatType.Metal);
const bottom = constructor.spline(squareXZ(-0.35, 0.35, -0.35, 0.35, 0));
const middle1 = constructor.spline(squareXZ(-0.35, 0.35, -0.35, 0.35, 0.1));
const middle2 = constructor.spline(squareXZ(-0.2, 0.2, -0.2, 0.2, 0.1));
const top = constructor.spline(squareXZ(-0.2, 0.2, -0.2, 0.2, 0.5));
constructor.band(bottom, middle1);
constructor.band(middle1, middle2);
constructor.band(middle2, top);
constructor.cap(top, 1);

constructor.setMaterial(MatType.Lights);
const lights = constructor.spline(circle({ center: [0, 0.5, 0], normal: [0, 1, 0], nPoints: 6, r: 0.1 }));
constructor.cap(lights, 1);
constructor.adjustCoords(constructor.last(), [0, 0.05, 0]);

export const miningTowerGeometry = new BufferGeometry();
constructor.target.writePositions(miningTowerGeometry);
constructor.target.writeVertexAttributes(miningTowerGeometry, PolyMat.createAttributes);
constructor.target.writeTriangles(miningTowerGeometry);
