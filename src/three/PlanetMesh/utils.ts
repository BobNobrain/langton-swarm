import { BufferGeometry, Float32BufferAttribute, Line, type Intersection, type Material } from 'three';
import type { NodeId } from '@/game';
import type { MeshBuilder } from '@/lib/MeshBuilder';
import type { RawVertex } from '@/lib/3d';

export function intersectionToTileId(closestIntersection: Intersection): NodeId | -1 {
    if (!closestIntersection) {
        return -1;
    }

    const faceIndexMap = closestIntersection.object.userData.faceIndexMap as Record<number, number> | undefined;
    if (!faceIndexMap) {
        return -1;
    }

    const originalFaceIndex = faceIndexMap[closestIntersection.faceIndex ?? -1] ?? -1;
    return originalFaceIndex;
}

export function getTileVerticies(surface: MeshBuilder, tileId: NodeId): RawVertex[] {
    return surface.face(tileId).map((vi) => surface.coords(vi));
}

export function createTileBorderGeometry({
    verticies,
    mat,
    name,
}: {
    verticies: RawVertex[];
    mat: Material;
    name?: string;
}) {
    verticies.push(verticies[0]);

    const polyGeometry = new BufferGeometry();
    polyGeometry.setAttribute('position', new Float32BufferAttribute(verticies.flat(), 3));

    const borderLine = new Line(polyGeometry, mat);
    borderLine.renderOrder = -1;
    if (name) {
        borderLine.name = name;
    }

    return borderLine;
}
