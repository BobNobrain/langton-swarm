import { BoxGeometry, MeshStandardMaterial, type BufferGeometry, type Material } from 'three';
import type { UnitConfiguration } from '@/game';

type UnitModel = {
    geom: BufferGeometry;
    mat: Material;
};

const rover: UnitModel = {
    geom: new BoxGeometry(0.02, 0.01, 0.03),
    mat: new MeshStandardMaterial({
        color: '#bbddff',
        roughness: 0.1,
        metalness: 0.7,
        emissive: '#bbbbff',
        emissiveIntensity: 0.2,
    }),
};

const mother: UnitModel = {
    geom: new BoxGeometry(0.04, 0.02, 0.04),
    mat: new MeshStandardMaterial({
        color: '#26496f',
        roughness: 0.1,
        metalness: 0.7,
        emissive: '#ed862d',
        emissiveIntensity: 0.2,
    }),
};

const unknown: UnitModel = {
    geom: new BoxGeometry(0.03, 0.03, 0.03),
    mat: new MeshStandardMaterial({
        color: '#ff00ff',
        roughness: 1,
        metalness: 0,
        emissive: '#ff00ff',
        emissiveIntensity: 0.5,
    }),
};

export function getUnitModel(config: UnitConfiguration | null): UnitModel {
    if (!config) {
        return unknown;
    }

    if (config.navigator) {
        return rover;
    }

    return mother;
}
