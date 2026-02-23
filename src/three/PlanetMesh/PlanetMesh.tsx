import { createMemo, type Component } from 'solid-js';
import type { SurfaceNode } from '@/game/types';
import { calcCenter, normz } from '@/lib/3d';
import { getInvertedMesh, MeshBuilder, type MaterialData, type RawFace } from '@/lib/MeshBuilder';
import { MeshPainter } from '@/lib/MeshPainter';
import { Mesh, MeshStandardMaterial } from 'three';
import { useInScene } from '../hooks/useInScene';

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

    const planetMesh = createMemo(() => {
        const graph = graphBuilder();
        if (!graph) {
            return null;
        }

        const painter = new MeshPainter(graph, () => null);
        const palette: MaterialData[] = [{ reflective: [0.5, 0.5, 0.5] }, { reflective: [0.3, 0.3, 0.3] }];
        for (let tileIndex = 0; tileIndex < graph.size().verticies; tileIndex++) {
            painter.setTileColor(tileIndex, tileIndex % palette.length);
        }
        painter.setPalette(palette);

        const surface = getInvertedMesh(graph);
        painter.paintSurface(surface);

        const triangulated = surface.clone().buildTriangulated(planetTriangulator);

        const surfaceGeom = triangulated.geometry;
        const surfaceMat = new MeshStandardMaterial({
            roughness: 0.9,
            flatShading: true,
            vertexColors: true,
        });

        return new Mesh(surfaceGeom, surfaceMat);
    });

    useInScene(planetMesh);

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
