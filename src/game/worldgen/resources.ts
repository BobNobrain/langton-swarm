import { drawInteger, pick, RandomNumberGenerator } from '@/lib/random';
import { type NodeId } from '../types';
import type { GeneratedPlanet } from './types';

export type KnownResourceName = 'electrical' | 'structural' | 'energetical' | 'special' | 'combat';

type ResourceData = {
    resource: KnownResourceName;
    centerMin: number;
    centerMax: number;
    edgeMin: number;
    edgeMax: number;
    secondaryCenterProb: number;
};

const RESOURCES: ResourceData[] = [
    {
        resource: 'electrical',
        centerMin: 40,
        centerMax: 50,
        edgeMin: 5,
        edgeMax: 20,
        secondaryCenterProb: 0.3,
    },
    {
        resource: 'structural',
        centerMin: 80,
        centerMax: 120,
        edgeMin: 15,
        edgeMax: 50,
        secondaryCenterProb: 0.1,
    },
    {
        resource: 'energetical',
        centerMin: 20,
        centerMax: 40,
        edgeMin: 3,
        edgeMax: 10,
        secondaryCenterProb: 0.1,
    },
];

export function generateResourceDeposits(seed: string, planet: GeneratedPlanet) {
    const rng = new RandomNumberGenerator(seed);
    const seq = rng.detached();

    const nDeposits = Math.floor(planet.graph.size() * (0.01 + 0.02 * seq()));
    const connections = planet.graph.getConnections() as Set<NodeId>[];

    for (let i = 0; i < nDeposits; i++) {
        const resourceData = pick(seq, RESOURCES);
        const centers = new Set<NodeId>();
        const edges = new Set<NodeId>();

        const randomCenterNodeIndex = drawInteger(seq, { min: 0, max: connections.length }) as NodeId;

        for (const connected of connections[randomCenterNodeIndex]) {
            if (seq() < resourceData.secondaryCenterProb) {
                centers.add(connected);
                continue;
            }

            edges.add(connected);
        }

        for (const secondaryCenter of centers) {
            for (const connected of connections[secondaryCenter]) {
                if (centers.has(connected)) {
                    continue;
                }

                edges.add(connected);
            }
        }

        centers.add(randomCenterNodeIndex);

        for (const centerId of centers) {
            const coeff = planet.landscape.getResourceScaling(centerId);
            if (coeff <= 0) {
                continue;
            }

            planet.resources.set(centerId, {
                resource: resourceData.resource,
                amount: Math.floor(
                    coeff *
                        (resourceData.centerMin +
                            Math.floor((resourceData.centerMax - resourceData.centerMin) * seq())),
                ),
                isDiscovered: false,
            });
        }

        for (const edgeId of edges) {
            const coeff = planet.landscape.getResourceScaling(edgeId);
            if (coeff <= 0) {
                continue;
            }

            planet.resources.set(edgeId, {
                resource: resourceData.resource,
                amount: Math.floor(
                    coeff * (resourceData.edgeMin + Math.floor((resourceData.edgeMax - resourceData.edgeMin) * seq())),
                ),
                isDiscovered: false,
            });
        }
    }
}
