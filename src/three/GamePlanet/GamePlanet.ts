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
import { useClickableMesh } from '../hooks/handlers';
import { useAllInScene } from '../hooks/useInScene';
import { PALETTE } from './colors';
import { HoverPoly } from './HoverPoly';
import { TileBorders } from './TileBorders';

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

const selectionMat = new LineBasicMaterial({ color: 0x67b740, transparent: true, linewidth: 3 });

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
    const borders = new TileBorders(meshData, surface.nRealVerticies());
    const ti = terraIncognita(world);
    const hoverPoly = new HoverPoly(surfaceMesh, surface, meshData, (tid) => props.onTileHover(tid));

    createEffect(() => {
        const s = scene();
        const objects = [surfaceMesh, borders.obj(), ti, hoverPoly.obj()];
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
            meshData.writeToGeometry(surfaceMesh.geometry);

            borders.rerender();
            // hoverPoly.rerender(); // does nothing yet
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
    const surface = PlanetSurface.fromGraph<NodeId>(world.graph, world.radius);
    surface.applyLandscape(world.landscape);

    const meshData = new RawMesh<NodeId>();
    surface.renderVerticies(meshData, PALETTE);
    surface.renderTiles(meshData, world.terraIncognita);

    return { surface, meshData };
}

function tileMesh(meshData: RawMesh<NodeId>) {
    const geom = new BufferGeometry();
    meshData.writeToGeometry(geom);

    const mesh = new Mesh(geom, surfaceMat);
    mesh.name = 'planetMesh';
    return mesh;
}

function terraIncognita(world: GameWorld) {
    const terraIncognita = new Mesh(new SphereGeometry(world.radius * 0.99, 64, 64), terraIncognitaMat);
    terraIncognita.name = 'terraIncognita';
    return terraIncognita;
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
