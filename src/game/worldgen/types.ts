import type { Landscape } from '@/lib/planet/Landscape';
import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import type { NodeId } from '../types';
import type { PlanetaryResources } from '../resources';

export type GeneratedPlanet = {
    radius: number;
    graph: PlanetGraph;
    resources: PlanetaryResources;
    spawnLocation: NodeId;
    landscape: Landscape;
};
