import { ConeGeometry, MeshStandardMaterial, type Material } from 'three';

export const defaultMat = new MeshStandardMaterial({
    color: '#ff00ff',
    roughness: 1,
    metalness: 0,
});

export const materialsByResource: Record<string, Material> = {
    copper: new MeshStandardMaterial({
        color: '#d27015',
        roughness: 0.6,
        metalness: 0.7,
    }),
    titanium: new MeshStandardMaterial({
        color: '#656e8c',
        roughness: 0.6,
        metalness: 0.7,
    }),
};

export const depositModel = new ConeGeometry(0.5, 0.05);
