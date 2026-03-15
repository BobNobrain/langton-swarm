import { pick, RandomNumberGenerator } from '@/lib/random';
import { type NodeId, type Planet } from '../types';

type ResourceData = {
    resource: string;
    centerMin: number;
    centerMax: number;
    edgeMin: number;
    edgeMax: number;
    secondaryCenterProb: number;
};

const RESOURCES: ResourceData[] = [
    {
        resource: 'copper',
        centerMin: 40,
        centerMax: 50,
        edgeMin: 5,
        edgeMax: 20,
        secondaryCenterProb: 0.1,
    },
    {
        resource: 'titanium',
        centerMin: 80,
        centerMax: 120,
        edgeMin: 15,
        edgeMax: 50,
        secondaryCenterProb: 0.1,
    },
];

export function generateResourceDeposits(seed: string, planet: Planet) {
    const rng = new RandomNumberGenerator(seed);
    const seq = rng.detached();

    const nDeposits = Math.floor(planet.nodes.length * (0.01 + 0.02 * seq()));

    for (let i = 0; i < nDeposits; i++) {
        const resourceData = pick(seq, RESOURCES);
        const centers = new Set<NodeId>();
        const edges = new Set<NodeId>();

        const randomCenterNode = pick(seq, planet.nodes);

        for (const connected of randomCenterNode.connections) {
            if (seq() < resourceData.secondaryCenterProb) {
                centers.add(connected);
                continue;
            }

            edges.add(connected);
        }

        for (const secondaryCenter of centers) {
            for (const connected of planet.nodes[secondaryCenter].connections) {
                if (centers.has(connected)) {
                    continue;
                }

                edges.add(connected);
            }
        }

        centers.add(randomCenterNode.index);

        for (const centerId of centers) {
            planet.resources.set(centerId, {
                resource: resourceData.resource,
                amount: resourceData.centerMin + Math.floor((resourceData.centerMax - resourceData.centerMin) * seq()),
            });
        }

        for (const edgeId of edges) {
            planet.resources.set(edgeId, {
                resource: resourceData.resource,
                amount: resourceData.edgeMin + Math.floor((resourceData.edgeMax - resourceData.edgeMin) * seq()),
            });
        }
    }
}
