import type { RawColor } from '@/lib/3d';
import { Biome } from '@/lib/planet/Landscape';

export const PALETTE: RawColor[] = [];

PALETTE[Biome.Regolith] = [0.5, 0.5, 0.5];
PALETTE[Biome.Basalt] = [0.3, 0.3, 0.3];
PALETTE[Biome.Lava] = [1.0, 0.7, 0.3];
