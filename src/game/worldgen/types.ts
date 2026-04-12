import type { NodeId, ResourceDeposit } from '../types';
import type { PlanetGraph } from '@/lib/planet/PlanetGraph';

export type GeneratedPlanet = {
    radius: number;
    graph: PlanetGraph;
    resources: Map<NodeId, ResourceDeposit>;
    spawnLocation: NodeId;
    elevations: number[];
};
