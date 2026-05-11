import type { KnownResourceName } from '@/game/resources';
import { BufferAttribute, BufferGeometry, ConeGeometry, MeshStandardMaterial, type Material } from 'three';

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
        flatShading: true,
    }),
    structural: new MeshStandardMaterial({
        color: '#656e8c',
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
    }),
    energetical: new MeshStandardMaterial({
        color: '#8f907f',
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
    }),
    combat: new MeshStandardMaterial({
        color: '#db9898',
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
    }),
    special: new MeshStandardMaterial({
        color: '#78cad5',
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
    }),
};

export const depositModel = new BufferGeometry();
depositModel.setAttribute(
    'position',
    new BufferAttribute(
        new Float32Array([
            -0.4,
            -0.01,
            -0.4, // 0
            -0.1,
            -0.01,
            -0.3, // 1
            -0.3,
            -0.01,
            -0.1, // 2
            -0.2,
            0.01,
            -0.3, // 3
            0.0,
            -0.01,
            0.0, // 4
            0.4,
            -0.01,
            -0.1, // 5
            0.3,
            -0.01,
            0.2, // 6
            0.3,
            0.01,
            0.0, // 7
            -0.1,
            -0.01,
            0.0, // 8
            0.0,
            -0.01,
            0.3, // 9
            -0.3,
            -0.01,
            0.1, // 10
            -0.1,
            0.005,
            0.2, // 11
        ]),
        3,
    ),
);
depositModel.setIndex([1, 0, 3, 1, 3, 2, 3, 0, 2, 5, 4, 7, 6, 5, 7, 7, 4, 6, 9, 8, 11, 11, 8, 10, 9, 11, 10]);
depositModel.computeVertexNormals();
