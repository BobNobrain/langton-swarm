import { Landscape, type LandscapeSerialized } from '@/lib/planet/Landscape';
import { PlanetGraph, type PlanetGraphSerialized } from '@/lib/planet/PlanetGraph';
import { drawInteger, RandomNumberGenerator } from '@/lib/random';
import { sleep } from '@/lib/timeouts';
import { PlanetaryResources, type PlanetaryResourcesSerialized } from '../resources';
import { type CreateGameProgressListener, type NodeId, type WorldgenOptions } from '../types';
import { generateResourceDeposits } from './resources';
import { generateSpawnPoint } from './spawn';
import type { GeneratedPlanet } from './types';
import type { SavedStatePartition, SavedStateValue } from '@/lib/SavedState';

export async function generatePlanet(
    opts: WorldgenOptions,
    onProgress: CreateGameProgressListener | undefined,
): Promise<GeneratedPlanet> {
    onProgress?.({ progress: 0, stage: 'Building planet graph' });
    await sleep(0);

    const SIZE = 1;

    const graph = new PlanetGraph(1);
    graph.subdivide(opts.subdivisions);

    const rng = new RandomNumberGenerator(opts.seed);
    const seq = rng.detached();

    onProgress?.({ progress: 0.1, stage: 'Randomizing planet graph' });
    await sleep(0);

    graph.rotateRandomEdges({
        random: seq,
        n: drawInteger(seq, {
            min: 3 * opts.subdivisions,
            max: 6 * opts.subdivisions,
        }),
    });

    const idealFaceArea = (4 * Math.PI * SIZE * SIZE) / graph.nFaces();
    const idealEdgeLength = Math.sqrt((idealFaceArea * 4) / Math.sqrt(3));

    onProgress?.({ progress: 0.5, stage: 'Relaxing planet graph' });
    await sleep(0);

    graph.relax({
        targetEdgeLength: idealEdgeLength,
        maxPasses: 100,
        changeRate: 0.9,
        minChange: idealEdgeLength * 0.01,
        seq,
    });

    console.log('[INFO] graph size', graph.size(), graph.nFaces());

    onProgress?.({ progress: 0.9, stage: 'Creating the landscape' });
    await sleep(0);

    const planetRadius = Math.sqrt(graph.nFaces() / (4 * Math.PI));
    graph.scale(planetRadius);

    const landscape = new Landscape(graph);
    landscape.generateLandscape({
        seq,
        minSplats: opts.minSplats,
        maxSplats: opts.maxSplats,
        maxElevation: opts.maxElevation,
    });

    const planet: GeneratedPlanet = {
        radius: planetRadius,
        graph,
        landscape,
        resources: new PlanetaryResources(graph),
        spawnLocation: generateSpawnPoint(seq, graph, landscape),
    };

    onProgress?.({ progress: 0.95, stage: 'Generating resources' });
    await sleep(0);

    generateResourceDeposits(seq, planet);

    return planet;
}

type SaveData = {
    v: 1;
    spawnLocation: NodeId;
    radius: number;
    graph: PlanetGraphSerialized;
    landscape: LandscapeSerialized;
    resources: PlanetaryResourcesSerialized;
};

export function loadPlanet(savedState: SavedStateValue<SaveData>): GeneratedPlanet {
    const data = savedState.get()!;
    const graph = PlanetGraph.deserialize(data.graph);

    return {
        radius: data.radius,
        spawnLocation: data.spawnLocation,
        graph,
        landscape: Landscape.deserialize(data.landscape, graph),
        resources: PlanetaryResources.deserialize(data.resources, graph),
    };
}

export function setupPlanetSaving(planet: GeneratedPlanet, savedState: SavedStateValue<SaveData>) {
    savedState.onSave(() => {
        return {
            v: 1,
            radius: planet.radius,
            spawnLocation: planet.spawnLocation,
            graph: planet.graph.serialize(),
            landscape: planet.landscape.serialize(),
            resources: planet.resources.serialize(),
        };
    });
}
