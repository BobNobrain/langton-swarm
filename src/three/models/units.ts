import {
    BoxGeometry,
    CylinderGeometry,
    DoubleSide,
    MeshStandardMaterial,
    SphereGeometry,
    type BufferGeometry,
    type Material,
} from 'three';
import { UnitModelType } from '@/game';

export type UnitModel = {
    geom: BufferGeometry;
    mat: Material;
};

const rover: UnitModel = {
    geom: new BoxGeometry(0.2, 0.1, 0.3),
    mat: new MeshStandardMaterial({
        color: '#bbddff',
        roughness: 0.1,
        metalness: 0.7,
        emissive: '#bbbbff',
        emissiveIntensity: 0.2,
    }),
};

const mother: UnitModel = {
    geom: new BoxGeometry(0.7, 0.3, 0.7),
    mat: new MeshStandardMaterial({
        color: '#26496f',
        roughness: 0.1,
        metalness: 0.7,
        emissive: '#ed862d',
        emissiveIntensity: 0.2,
    }),
};

const pile: UnitModel = {
    geom: new SphereGeometry(0.3, 4, 4),
    mat: new MeshStandardMaterial({
        color: '#76be7f',
        roughness: 1,
        emissive: '#76be7f',
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        wireframe: true,
    }),
};

const unknown: UnitModel = {
    geom: new BoxGeometry(0.3, 0.3, 0.3),
    mat: new MeshStandardMaterial({
        color: '#ff00ff',
        roughness: 1,
        metalness: 0,
        emissive: '#ff00ff',
        emissiveIntensity: 0.5,
    }),
};

export function getUnitModel(type: UnitModelType): UnitModel {
    switch (type) {
        case UnitModelType.Mother:
            return mother;

        case UnitModelType.Rover:
            return rover;

        case UnitModelType.Pile:
            return pile;

        default:
            return unknown;
    }
}

export const selection: UnitModel = {
    geom: new CylinderGeometry(0.6, 0.6, 0.5, 16, 1, true),
    mat: new MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 1,
        opacity: 0.2,
        transparent: true,
        side: DoubleSide,
    }),
};
