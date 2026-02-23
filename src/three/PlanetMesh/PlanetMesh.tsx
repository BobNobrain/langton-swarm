import { createMemo, type Component } from 'solid-js';
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import type { SurfaceNode } from '@/game/types';
import { calcCenter, normz } from '@/lib/3d';
import { getInvertedMesh, MeshBuilder, type MaterialData, type RawFace } from '@/lib/MeshBuilder';
import { MeshPainter } from '@/lib/MeshPainter';
import { useInScene } from '../hooks/useInScene';

const bordersMat = new LineBasicMaterial({ color: 0xffffff, opacity: 0.3, linewidth: 2, transparent: true });
const SCALE_UP = 1.001;

export const PlanetMesh: Component<{ planetNodes: SurfaceNode[] }> = (props) => {
    const graphBuilder = createMemo(() => {
        const nodes = props.planetNodes;
        if (!nodes.length) {
            return null;
        }

        const builder = new MeshBuilder();

        for (const node of nodes) {
            const { x, y, z } = node.position;
            builder.add(x, y, z);
        }

        for (let vi = 0; vi < nodes.length; vi++) {
            const connecteds = nodes[vi].connections;

            for (const vj of connecteds.values()) {
                for (const vk of connecteds.values()) {
                    if (vk === vi || vj >= vk) {
                        continue;
                    }

                    const areConnected = nodes[vj].connections.has(vk);

                    if (areConnected) {
                        builder.assembleVerticies([vi, vj, vk]);
                    }
                }
            }
        }

        return builder;
    });

    const invertedMesh = createMemo(() => {
        const graph = graphBuilder();
        if (!graph) {
            return null;
        }
        const surface = getInvertedMesh(graph);
        return surface;
    });

    const surfaceBuilder = createMemo(() => {
        const graph = graphBuilder();
        if (!graph) {
            return null;
        }
        const surface = invertedMesh()!;

        const painter = new MeshPainter(graph, () => null);
        const palette: MaterialData[] = [{ reflective: [0.5, 0.5, 0.5] }, { reflective: [0.3, 0.3, 0.3] }];
        for (let tileIndex = 0; tileIndex < graph.size().verticies; tileIndex++) {
            painter.setTileColor(tileIndex, tileIndex % palette.length);
        }
        painter.setPalette(palette);

        painter.paintSurface(surface);
        return surface;
    });

    const planetMesh = createMemo(() => {
        const surface = surfaceBuilder();
        if (!surface) {
            return null;
        }

        const triangulated = surface.clone().buildTriangulated(planetTriangulator);

        const surfaceGeom = triangulated.geometry;
        const surfaceMat = new MeshStandardMaterial({
            roughness: 0.9,
            flatShading: true,
            vertexColors: true,
        });

        const mesh = new Mesh(surfaceGeom, surfaceMat);
        mesh.name = 'planetMesh';
        return mesh;
    });

    const gridEdgesMesh = createMemo(() => {
        const surface = invertedMesh();
        if (!surface) {
            return null;
        }

        const coords: number[] = [];

        for (const face of surface.getAllFaces()) {
            for (let i = 0; i < face.length; i++) {
                const a = surface.getOriginalVertexIndex(face[i]);
                const b = surface.getOriginalVertexIndex(face[(i + 1) % face.length]);

                const [ax, ay, az] = surface.coords(a);
                coords.push(ax * SCALE_UP, ay * SCALE_UP, az * SCALE_UP);

                const [bx, by, bz] = surface.coords(b);
                coords.push(bx * SCALE_UP, by * SCALE_UP, bz * SCALE_UP);
            }
        }

        const geom = new BufferGeometry();
        geom.setAttribute('position', new BufferAttribute(new Float32Array(coords), 3));

        const result = new LineSegments(geom, bordersMat);
        result.name = 'planetGrid';
        result.renderOrder = -1;

        return result;
    });

    useInScene(planetMesh);
    useInScene(gridEdgesMesh);

    return null;
};

// Adds a center point on each tile
function planetTriangulator(vs: number[], builder: MeshBuilder): RawFace[] {
    const middleCoords = normz(calcCenter(vs.map((vi) => builder.coords(vi))));
    const result: RawFace[] = [];
    const middle = builder.add(...middleCoords);
    builder.paintVertex(middle, builder.getVertexMaterial(vs[0])!);

    for (let i = 0; i < vs.length - 1; i++) {
        result.push([middle, vs[i], vs[i + 1]]);
    }
    result.push([middle, vs[vs.length - 1], vs[0]]);

    return result;
}
