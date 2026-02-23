import { calcCenter, normz, scale } from './3d';
import { MeshBuilder, Poly } from './MeshBuilder';

type GenerateOptions = {
    size?: number;
    subdivisions?: number;
};

export function icosahedron({ size = 1, subdivisions = 1 }: GenerateOptions) {
    const phi = (1.0 + Math.sqrt(5.0)) / 2.0;
    const du = size / Math.sqrt(phi * phi + 1.0);
    const dv = phi * du;

    const builder = new MeshBuilder();
    builder.addMany([
        [0, +dv, +du],
        [0, +dv, -du],
        [0, -dv, +du],
        [0, -dv, -du],
        [+du, 0, +dv],
        [-du, 0, +dv],
        [+du, 0, -dv],
        [-du, 0, -dv],
        [+dv, +du, 0],
        [+dv, -du, 0],
        [-dv, +du, 0],
        [-dv, -du, 0],
    ]);

    builder.assembleVerticies([8, 1, 0]);
    builder.assembleVerticies([5, 4, 0]);
    builder.assembleVerticies([10, 5, 0]);
    builder.assembleVerticies([4, 8, 0]);
    builder.assembleVerticies([1, 10, 0]);
    builder.assembleVerticies([8, 6, 1]);
    builder.assembleVerticies([6, 7, 1]);
    builder.assembleVerticies([7, 10, 1]);
    builder.assembleVerticies([11, 3, 2]);
    builder.assembleVerticies([9, 4, 2]);
    builder.assembleVerticies([4, 5, 2]);
    builder.assembleVerticies([3, 9, 2]);
    builder.assembleVerticies([5, 11, 2]);
    builder.assembleVerticies([7, 6, 3]);
    builder.assembleVerticies([11, 7, 3]);
    builder.assembleVerticies([6, 9, 3]);
    builder.assembleVerticies([9, 8, 4]);
    builder.assembleVerticies([10, 11, 5]);
    builder.assembleVerticies([8, 9, 6]);
    builder.assembleVerticies([11, 10, 7]);

    for (let i = 0; i < subdivisions; i++) {
        builder.subdivide(subdivideTriangle);
    }

    builder.mapVerticies(normz);
    builder.mapVerticies(scale(size));

    return builder;
}

function subdivideTriangle(triangle: Poly, builder: MeshBuilder): Poly[] {
    const coords = triangle.map((i) => builder.coords(i));
    const middleCoords = [
        calcCenter([coords[0], coords[1]]),
        calcCenter([coords[1], coords[2]]),
        calcCenter([coords[2], coords[0]]),
    ];

    const middles = middleCoords.map((c) => builder.addIfNotClose(...c));

    return [
        [middles[2], triangle[0], middles[0]],
        [middles[0], triangle[1], middles[1]],
        [middles[1], triangle[2], middles[2]],
        middles,
    ];
}
