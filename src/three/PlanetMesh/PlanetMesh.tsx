import { createMemo, For, type Component } from 'solid-js';
import {
    BufferAttribute,
    BufferGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    type Material,
} from 'three';
import type { HighlightedTile, NodeId, SurfaceNode } from '@/game';
import { renderTileId } from '@/game/utils';
import { avgSize, calcCenter, normz, scale, size } from '@/lib/3d';
import { MouseButton } from '@/lib/input';
import { getInvertedMesh, MeshBuilder, type MaterialData, type RawFace } from '@/lib/MeshBuilder';
import { MeshPainter } from '@/lib/MeshPainter';
import { onBeforeRepaint, useClickableMesh } from '../hooks/handlers';
import { useInScene, useAllInScene } from '../hooks/useInScene';
import { createTileBorderGeometry, getTileVerticies, intersectionToTileId } from './utils';

const bordersMat = new LineBasicMaterial({ color: 0xffffff, opacity: 0.15, linewidth: 2, transparent: true });
const selectionMat = new LineBasicMaterial({ color: 0x67b740, transparent: true, linewidth: 3 });
const hoverMat = new MeshBasicMaterial({ color: 0x67b740, transparent: true, opacity: 0.4 });
const SCALE_UP = 1.001;

const borderMatsByColor: Record<HighlightedTile['color'], Material> = {
    primary: selectionMat,
    white: new LineBasicMaterial({ color: 0xffffff, transparent: true, linewidth: 3 }),
};

export const PlanetMesh: Component<{
    planetNodes: SurfaceNode[];
    selectedTileId?: NodeId | null;
    hilightedTiles?: HighlightedTile[];
    onTileClick: (tileId: NodeId) => void;
    onTileRightClick: (tileId: NodeId, ev: MouseEvent) => void;
    onTileHover: (tileId: NodeId | null) => void;
}> = (props) => {
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
        mesh.userData.faceIndexMap = triangulated.faceIndexMap;
        return mesh;
    });
    useClickableMesh({
        object: planetMesh,
        button: [MouseButton.Left, MouseButton.Right],
        onClick: ({ intersection, source }) => {
            const faceIndexMap = intersection.object.userData.faceIndexMap as Record<number, NodeId> | undefined;
            if (!faceIndexMap) {
                return;
            }

            const originalFaceIndex = faceIndexMap[intersection.faceIndex ?? -1] ?? -1;
            if (originalFaceIndex === -1) {
                return;
            }

            if (source.button === MouseButton.Left) {
                props.onTileClick(originalFaceIndex);
            } else {
                props.onTileRightClick(originalFaceIndex, source);
            }
        },
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

    const activeTileMesh = createMemo(() => {
        const surface = invertedMesh();
        if (!surface) {
            return null;
        }

        const index = props.selectedTileId ?? -1;
        if (index === -1) {
            return null;
        }

        const verticies = getTileVerticies(surface, index).map(scale(SCALE_UP));
        return createTileBorderGeometry({ verticies, mat: selectionMat, name: 'selectedTileBorder' });
    });

    const hilightedTileMeshes = createMemo(() => {
        const surface = invertedMesh();
        if (!surface) {
            return [];
        }

        const hts = props.hilightedTiles ?? [];
        return hts.map((ht) => {
            const verticies = getTileVerticies(surface, ht.tileId).map(scale(SCALE_UP));
            return createTileBorderGeometry({
                verticies,
                mat: borderMatsByColor[ht.color],
                name: 'hilightedTile_' + renderTileId(ht.tileId),
            });
        });
    });

    const hoverGeometry = new BufferGeometry();
    const hoverPoly = new Mesh(hoverGeometry, hoverMat);
    hoverPoly.renderOrder = -1;
    hoverPoly.name = 'hoveredTilePoly';
    onBeforeRepaint(({ cursor }) => {
        hoverPoly.visible = false;
        props.onTileHover(null);

        if (!cursor) {
            return;
        }
        const surface = invertedMesh();
        const planet = planetMesh();
        if (!surface || !planet) {
            return;
        }

        const [closestIntersection] = cursor.intersectObject(planet);
        const originalFaceIndex = intersectionToTileId(closestIntersection);
        if (originalFaceIndex === -1) {
            return;
        }

        props.onTileHover(originalFaceIndex);

        const verticies = getTileVerticies(surface, originalFaceIndex).map(scale(SCALE_UP));

        const builder = new MeshBuilder();
        for (const v of verticies) {
            builder.add(...v);
        }
        builder.assembleVerticies(verticies.map((_, i) => i));
        builder.buildTriangulated(planetTriangulator, hoverGeometry);
        hoverPoly.visible = true;
    });

    useInScene(planetMesh);
    useInScene(gridEdgesMesh);
    useInScene(activeTileMesh);
    useInScene(() => hoverPoly);
    useAllInScene(hilightedTileMeshes);

    return null;
};

// Adds a center point on each tile
function planetTriangulator(vs: number[], builder: MeshBuilder): RawFace[] {
    const vcs = vs.map((vi) => builder.coords(vi));
    const middleCoords = scale(avgSize(vcs))(normz(calcCenter(vcs)));
    const result: RawFace[] = [];
    const middle = builder.add(...middleCoords);

    const material = builder.getVertexMaterial(vs[0]);
    if (material) {
        builder.paintVertex(middle, material);
    }

    for (let i = 0; i < vs.length - 1; i++) {
        result.push([middle, vs[i], vs[i + 1]]);
    }
    result.push([middle, vs[vs.length - 1], vs[0]]);

    return result;
}
