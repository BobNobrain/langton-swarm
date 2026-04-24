import type { KnownResourceName } from '@/game/worldgen/resources';
import { ConeGeometry, MeshStandardMaterial, type Material } from 'three';

export const defaultMat = new MeshStandardMaterial({
    color: '#ff00ff',
    roughness: 1,
    metalness: 0,
});

export const materialsByResource: Record<KnownResourceName, Material> = {
    electrical: new MeshStandardMaterial({
        color: '#d27015',
        roughness: 0.6,
        metalness: 0.7,
    }),
    structural: new MeshStandardMaterial({
        color: '#656e8c',
        roughness: 0.6,
        metalness: 0.7,
    }),
    energetical: new MeshStandardMaterial({
        color: '#8f907f',
        roughness: 0.6,
        metalness: 0.7,
    }),
    combat: new MeshStandardMaterial({
        color: '#db9898',
        roughness: 0.6,
        metalness: 0.7,
    }),
    special: new MeshStandardMaterial({
        color: '#78cad5',
        roughness: 0.6,
        metalness: 0.7,
    }),
};

export const depositModel = new ConeGeometry(0.3, 0.05);
