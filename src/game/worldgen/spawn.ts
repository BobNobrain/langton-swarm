import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { drawInteger, type RandomSequence } from '@/lib/random';
import type { NodeId } from '../types';

export function generateSpawnPoint(seq: RandomSequence, graph: PlanetGraph): NodeId {
    const pos = drawInteger(seq, { min: 0, max: graph.size() });
    return pos as NodeId;
}
