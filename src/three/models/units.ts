import {
    BoxGeometry,
    type BufferGeometry,
    CylinderGeometry,
    DoubleSide,
    MeshStandardMaterial,
    SphereGeometry,
    type Material,
} from 'three';
import { UnitModelType, Faction } from '@/game';
import { miningTowerGeometry, miningTowerMaterial } from './miningTower';
import { motherGeometry, motherMaterial } from './mother';
import { roverGeometry, roverMaterial } from './rover';

export type UnitModel = {
    geom: BufferGeometry;
    mat: Material;
};

type UnitModelConstructor = (faction: Faction) => UnitModel;

const rover: UnitModelConstructor = (faction) => ({
    geom: roverGeometry,
    mat: roverMaterial(faction.color),
});

const mother: UnitModelConstructor = (faction) => ({
    geom: motherGeometry,
    mat: motherMaterial(faction.color),
});

const tower: UnitModelConstructor = (faction) => ({
    geom: miningTowerGeometry,
    mat: miningTowerMaterial(faction.color),
});

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

const site: UnitModel = {
    geom: new BoxGeometry(0.7, 0.3, 0.7),
    mat: new MeshStandardMaterial({
        color: '#d2e5ea',
        emissive: '#d2e5ea',
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

export function getUnitModelFactionless(type: UnitModelType): UnitModel {
    switch (type) {
        case UnitModelType.Pile:
            return pile;

        case UnitModelType.ConstructionSite:
            return site;

        default:
            return unknown;
    }
}
export function getUnitModel(type: UnitModelType, faction: Faction): UnitModel {
    switch (type) {
        case UnitModelType.Mother:
            return mother(faction);

        case UnitModelType.Rover:
            return rover(faction);

        case UnitModelType.MiningTower:
            return tower(faction);

        default:
            return getUnitModelFactionless(type);
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
