import { createEffect, createMemo, onCleanup, onMount, type Component } from 'solid-js';
import {
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    Line,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    type Material,
    type Object3D,
} from 'three';
import type { GameWorld, HighlightedTile, NodeId } from '@/game';
import { useGame } from '@/gameContext';
import { createEventListener } from '@/hooks/events';
import { MouseButton } from '@/lib/input';
import { PlanetSurface } from '@/lib/planet/PlanetMesh';
import { RawMesh } from '@/lib/planet/RawMesh';
import { useSceneRenderer } from '../context';
import { onBeforeRepaint, useClickableMesh } from '../hooks/handlers';
import { useAllInScene } from '../hooks/useInScene';
import { palette } from './colors';

const SCALE_UP = 1.001;

const surfaceMat = new MeshStandardMaterial({
    roughness: 0.9,
    flatShading: true,
    vertexColors: true,
    side: DoubleSide, // tiles are pointing outwards, but cliff walls are not (yet?)
});

const terraIncognitaMat = new MeshStandardMaterial({
    roughness: 0.7,
    color: '#444444',
});

const bordersMat = new LineBasicMaterial({ color: 0xffffff, opacity: 0.15, linewidth: 2, transparent: true });
const selectionMat = new LineBasicMaterial({ color: 0x67b740, transparent: true, linewidth: 3 });
const hoverMat = new MeshBasicMaterial({ color: 0x67b740, transparent: true, opacity: 0.4 });

const borderMatsByColor: Record<HighlightedTile['color'], Material> = {
    primary: selectionMat,
    white: new LineBasicMaterial({ color: 0xffffff, transparent: true, linewidth: 3 }),
};

export const GamePlanet: Component<{
    selectedTileId?: NodeId | null;
    hilightedTiles?: HighlightedTile[];
    onTileClick: (tileId: NodeId) => void;
    onTileRightClick: (tileId: NodeId, ev: MouseEvent) => void;
    onTileHover: (tileId: NodeId | null) => void;
}> = (props) => {
    const { scene } = useSceneRenderer();
    const { world } = useGame();

    const { surface, meshData } = setup(world);
    const surfaceMesh = tileMesh(meshData);
    const borders = tileBorders(meshData, surface.nRealVerticies());
    const ti = terraIncognita(world);
    const hover = hoverPoly(surfaceMesh, surface, meshData, (tid) => props.onTileHover(tid));

    createEffect(() => {
        const s = scene();
        const objects = [surfaceMesh, borders, ti, hover];
        for (const obj of objects) {
            s.add(obj);
        }

        onCleanup(() => {
            for (const obj of objects) {
                s.remove(obj);
            }
        });
    });

    onMount(() => {
        createEventListener(world.terraIncognitaUpdate, () => {
            surface.renderTiles(meshData, world.terraIncognita);
        });
    });

    useClickableMesh({
        object: () => surfaceMesh,
        button: [MouseButton.Left, MouseButton.Right],
        onClick: ({ intersection, source }) => {
            const triangleIndex = intersection.faceIndex ?? -1;
            const tileId = triangleIndex < 0 ? -1 : meshData.getNodeByTriangleIndex(triangleIndex);
            if (tileId === -1) {
                return;
            }

            if (source.button === MouseButton.Left) {
                props.onTileClick(tileId);
            } else {
                props.onTileRightClick(tileId, source);
            }
        },
    });

    const selectedTileOutlines = createMemo(() => {
        const outlines: Object3D[] = [];

        if (typeof props.selectedTileId === 'number') {
            outlines.push(tileOutline(props.selectedTileId, selectionMat, surface));
        }
        for (const ht of props.hilightedTiles ?? []) {
            outlines.push(tileOutline(ht.tileId, borderMatsByColor[ht.color], surface));
        }

        return outlines;
    });

    useAllInScene(selectedTileOutlines);

    return null;
};

function setup(world: GameWorld) {
    const surface = PlanetSurface.fromGraph<NodeId>(
        world.surface.map((tile, i) => {
            return {
                coords: tile.position,
                connections: tile.connections,
                elevation: tile.elevation,
                materialIndex: tile.elevation % palette.length,
            };
        }),
        world.graph.getFaces(),
    );

    const meshData = new RawMesh<NodeId>();
    surface.renderVerticies(meshData, palette);
    surface.renderTiles(meshData, world.terraIncognita);

    return { surface, meshData };
}

function tileMesh(meshData: RawMesh<NodeId>) {
    const geom = new BufferGeometry();
    meshData.writeToGeometry(geom);

    const mesh = new Mesh(geom, surfaceMat);
    mesh.name = 'planetMesh2';
    return mesh;
}

function tileBorders(meshData: RawMesh<NodeId>, nRealVerticies: number) {
    const coords: number[] = [];
    const added = new Map<number, Set<number>>();
    const edges: [number, number][] = [];

    for (let i = 0; i < meshData.triangles.length; i++) {
        const [a, b, c] = meshData.triangles[i];
        edges.length = 0;

        const aOk = a < nRealVerticies;
        const bOk = b < nRealVerticies;
        const cOk = c < nRealVerticies;

        if (aOk && bOk) {
            edges.push([a, b]);
        }
        if (aOk && cOk) {
            edges.push([a, c]);
        }
        if (bOk && cOk) {
            edges.push([b, c]);
        }

        for (let e = 0; e < edges.length; e++) {
            const [a, b] = edges[e];
            const min = Math.min(a, b);
            const max = Math.max(a, b);

            const alreadyIn = added.getOrInsert(min, new Set());
            if (alreadyIn.has(max)) {
                continue;
            }

            alreadyIn.add(max);

            const [minX, minY, minZ] = meshData.vs[min];
            const [maxX, maxY, maxZ] = meshData.vs[max];
            coords.push(minX * SCALE_UP, minY * SCALE_UP, minZ * SCALE_UP);
            coords.push(maxX * SCALE_UP, maxY * SCALE_UP, maxZ * SCALE_UP);
        }
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(new Float32Array(coords), 3));

    const result = new LineSegments(geom, bordersMat);
    result.name = 'planetGrid';
    result.renderOrder = -1;

    return result;
}

function terraIncognita(world: GameWorld) {
    const terraIncognita = new Mesh(new SphereGeometry(world.radius * 0.99), terraIncognitaMat);
    terraIncognita.name = 'terraIncognita';
    return terraIncognita;
}

function hoverPoly(
    surfaceMesh: Object3D,
    surface: PlanetSurface<NodeId>,
    meshData: RawMesh<NodeId>,
    onTileHover: (tile: null | NodeId) => void,
) {
    const hoverGeometry = new BufferGeometry();
    const hoverPoly = new Mesh(hoverGeometry, hoverMat);
    hoverPoly.renderOrder = -1;
    hoverPoly.name = 'hoveredTilePoly';

    const hoverMeshData = new RawMesh<NodeId>();
    let renderedDataFor = -1 as NodeId;

    onBeforeRepaint(({ cursor }) => {
        hoverPoly.visible = false;
        onTileHover(null);

        if (!cursor) {
            return;
        }

        const [closestIntersection] = cursor.intersectObject(surfaceMesh);
        const triangleIndex = closestIntersection?.faceIndex ?? -1;
        const tileIndex = triangleIndex < 0 ? -1 : meshData.getNodeByTriangleIndex(triangleIndex);
        if (tileIndex === -1) {
            return;
        }

        onTileHover(tileIndex);
        hoverPoly.visible = true;

        if (tileIndex === renderedDataFor) {
            return;
        }

        hoverMeshData.clear();
        const vs = surface.getTile(tileIndex).vs;
        for (const vi of vs) {
            const [x, y, z] = surface.getVertexCoords(vi);
            hoverMeshData.addVertexUncolored([x * SCALE_UP, y * SCALE_UP, z * SCALE_UP]);
        }

        const [middleX, middleY, middleZ] = meshData.vs[surface.nRealVerticies() + tileIndex];
        hoverMeshData.addVertexUncolored([middleX * SCALE_UP, middleY * SCALE_UP, middleZ * SCALE_UP]);

        for (let i = 1; i < vs.length; i++) {
            hoverMeshData.addTriangle([i - 1, i, vs.length], tileIndex);
        }
        hoverMeshData.addTriangle([vs.length - 1, 0, vs.length], tileIndex);

        hoverMeshData.scale(SCALE_UP);
        hoverMeshData.writeToGeometry(hoverGeometry);
        renderedDataFor = tileIndex;
    });

    return hoverPoly;
}

function tileOutline(tileId: NodeId, mat: Material, surface: PlanetSurface<NodeId>) {
    const meshData = new RawMesh<NodeId>();
    const vs = surface.getTile(tileId).vs;
    for (const vi of vs) {
        const [x, y, z] = surface.getVertexCoords(vi);
        meshData.addVertexUncolored([x * SCALE_UP, y * SCALE_UP, z * SCALE_UP]);
    }
    meshData.addVertexUncolored(meshData.vs[0]);

    const polyGeometry = new BufferGeometry();
    meshData.writeToGeometry(polyGeometry);

    const borderLine = new Line(polyGeometry, mat);
    borderLine.renderOrder = -1;
    borderLine.name = `tileOutline_${tileId}`;

    return borderLine;
}
