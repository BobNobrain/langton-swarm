import type { Landscape } from '@/lib/planet/Landscape';
import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import type { NodeId, ResourceDeposit } from '../types';

export type GeneratedPlanet = {
    radius: number;
    graph: PlanetGraph;
    resources: Map<NodeId, ResourceDeposit>;
    spawnLocation: NodeId;
    landscape: Landscape;
};
