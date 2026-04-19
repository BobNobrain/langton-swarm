import { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { drawInteger, RandomNumberGenerator } from '@/lib/random';
import { sleep } from '@/lib/timeouts';
import { type CreateGameProgressListener, type WorldgenOptions } from '../types';
import { generateResourceDeposits } from './resources';
import { generateSpawnPoint } from './spawn';
import type { GeneratedPlanet } from './types';
import { Landscape } from '@/lib/planet/Landscape';

export async function generatePlanet(
    opts: WorldgenOptions,
    onProgress: CreateGameProgressListener | undefined,
): Promise<GeneratedPlanet> {
    onProgress?.({ progress: 0, stage: 'Building planet graph' });
    await sleep(0);

    const SIZE = 1;

    const graph = new PlanetGraph(1);
    graph.subdivide(4);

    const rng = new RandomNumberGenerator(opts.seed);
    const seq = rng.detached();

    onProgress?.({ progress: 0.1, stage: 'Randomizing planet graph' });
    await sleep(0);

    graph.rotateRandomEdges({ random: seq, n: drawInteger(seq, { min: 50, max: 100 }) });

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
        resources: new Map(),
        spawnLocation: generateSpawnPoint(seq, graph, landscape),
    };

    onProgress?.({ progress: 0.95, stage: 'Generating resources' });
    await sleep(0);

    generateResourceDeposits(opts.seed, planet);

    return planet;
}
