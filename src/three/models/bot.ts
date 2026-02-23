import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';

const mat = new MeshStandardMaterial({
    color: '#bbddff',
    roughness: 0.1,
    metalness: 0.7,
    emissive: '#bbbbff',
    emissiveIntensity: 0.2,
});

const model = new BoxGeometry(0.02, 0.01, 0.03);

export const botModel = { mat, model };
