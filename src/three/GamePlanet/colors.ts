import type { RawColor } from '@/lib/3d';
import { Biome } from '@/lib/planet/Landscape';
import { BufferAttribute } from 'three';

export type SurfaceTileMaterial = {
    color: RawColor;
    varianceColor: RawColor;
    varianceScale: number;
    emission: number;
    bumpiness: number;
    roughness: number;
    animationSpeed: number;
};

export const PALETTE: SurfaceTileMaterial[] = [];

PALETTE[Biome.Regolith] = {
    color: [0.5, 0.5, 0.5],
    varianceColor: [0.6, 0.55, 0.55],
    varianceScale: 0.2,
    emission: 0.0,
    bumpiness: 0.1,
    roughness: 1.0,
    animationSpeed: 0.0,
};
PALETTE[Biome.Basalt] = {
    color: [0.25, 0.25, 0.3],
    varianceColor: [0.2, 0.2, 0.25],
    varianceScale: 0.1,
    emission: 0.0,
    bumpiness: 0.03,
    roughness: 0.6,
    animationSpeed: 0.0,
};
PALETTE[Biome.Lava] = {
    color: [1.0, 0.5, 0.3],
    varianceColor: [0.8, 0.7, 0.2],
    varianceScale: 1.5,
    emission: 1.0,
    bumpiness: 0.0,
    roughness: 0.8,
    animationSpeed: 1.0,
};

export function createAttributes(mats: SurfaceTileMaterial[]): Record<string, BufferAttribute> {
    const color = new BufferAttribute(new Float32Array(mats.map((m) => m.color).flat()), 3);
    const varcolor = new BufferAttribute(new Float32Array(mats.map((m) => m.varianceColor).flat()), 3);
    const varscale = new BufferAttribute(new Float32Array(mats.map((m) => m.varianceScale)), 1);
    const emission = new BufferAttribute(new Float32Array(mats.map((m) => m.emission)), 1);
    const bumpiness = new BufferAttribute(new Float32Array(mats.map((m) => m.bumpiness)), 1);
    const roughness = new BufferAttribute(new Float32Array(mats.map((m) => m.roughness)), 1);
    const animation = new BufferAttribute(new Float32Array(mats.map((m) => m.animationSpeed)), 1);
    return { color, varcolor, varscale, emission, bumpiness, roughness, animation };
}
