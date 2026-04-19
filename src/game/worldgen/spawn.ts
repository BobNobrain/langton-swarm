import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { drawInteger, type RandomSequence } from '@/lib/random';
import type { NodeId } from '../types';
import type { Landscape } from '@/lib/planet/Landscape';

export function generateSpawnPoint(seq: RandomSequence, graph: PlanetGraph, landscape: Landscape): NodeId {
    for (let i = 0; i < 100; i++) {
        const pos = drawInteger(seq, { min: 0, max: graph.size() });
        if (!landscape.isSpawnable(pos)) {
            continue;
        }

        return pos as NodeId;
    }

    throw new Error('could not find a spawn location in 100 attempts');
}
