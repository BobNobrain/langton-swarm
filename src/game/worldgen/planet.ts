import { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { SplatGenerator } from '@/lib/planet/SplatGenerator';
import { drawInteger, RandomNumberGenerator } from '@/lib/random';
import { sleep } from '@/lib/timeouts';
import { type CreateGameProgressListener, type WorldgenOptions } from '../types';
import { generateResourceDeposits } from './resources';
import { generateSpawnPoint } from './spawn';
import type { GeneratedPlanet } from './types';

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
    const connections = graph.getConnections();

    graph.scale(planetRadius);
    const coords = graph.coords();
    const elevations = coords.map(() => 0);

    const nSplats = drawInteger(seq, { min: opts.minSplats, max: opts.maxSplats });
    const maxSplatSize = elevations.length / nSplats;
    const splatGenerator = new SplatGenerator(graph);

    for (let i = 0; i < nSplats; i++) {
        const splatSize = drawInteger(seq, { min: 0.1 * maxSplatSize, max: 0.8 * maxSplatSize });
        const splat = splatGenerator.generate(seq, splatSize);

        for (const vi of splat) {
            elevations[vi] += 1;
        }
    }
    for (let vi = 0; vi < elevations.length; vi++) {
        elevations[vi] = Math.min(elevations[vi], opts.maxElevation);
    }

    const planet: GeneratedPlanet = {
        radius: planetRadius,
        graph,
        elevations,
        resources: new Map(),
        spawnLocation: generateSpawnPoint(seq, graph),
    };

    onProgress?.({ progress: 0.95, stage: 'Generating resources' });
    await sleep(0);

    generateResourceDeposits(opts.seed, planet);

    return planet;
}
