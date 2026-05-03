import { drawInteger, pick, type RandomSequence } from '@/lib/random';
import { KnownResourceName, ResourceTier } from '../resources';
import { type NodeId } from '../types';
import type { GeneratedPlanet } from './types';

export function generateResourceDeposits(seq: RandomSequence, planet: GeneratedPlanet) {
    const gen = new ResourceGenerator(seq, planet);
    gen.generate();
}

type ResourceData = {
    resource: KnownResourceName;
    centerMin: number;
    centerMax: number;
    edgeMin: number;
    edgeMax: number;
    secondaryCenterProb: number;
    tier: ResourceTier;
};

const RESOURCES: ResourceData[] = [
    {
        resource: 'electrical',
        centerMin: 20,
        centerMax: 40,
        edgeMin: 5,
        edgeMax: 15,
        secondaryCenterProb: 0.3,
        tier: ResourceTier.Tier1,
    },
    {
        resource: 'structural',
        centerMin: 25,
        centerMax: 60,
        edgeMin: 5,
        edgeMax: 20,
        secondaryCenterProb: 0.3,
        tier: ResourceTier.Tier1,
    },
    {
        resource: 'energetical',
        centerMin: 15,
        centerMax: 40,
        edgeMin: 3,
        edgeMax: 12,
        secondaryCenterProb: 0.1,
        tier: ResourceTier.Tier1,
    },
    {
        resource: 'electrical',
        centerMin: 120,
        centerMax: 180,
        edgeMin: 40,
        edgeMax: 80,
        secondaryCenterProb: 0.5,
        tier: ResourceTier.Tier2,
    },
    {
        resource: 'structural',
        centerMin: 250,
        centerMax: 400,
        edgeMin: 95,
        edgeMax: 140,
        secondaryCenterProb: 0.5,
        tier: ResourceTier.Tier2,
    },
    {
        resource: 'energetical',
        centerMin: 140,
        centerMax: 190,
        edgeMin: 50,
        edgeMax: 85,
        secondaryCenterProb: 0.5,
        tier: ResourceTier.Tier2,
    },
    {
        resource: 'special',
        centerMin: 5,
        centerMax: 15,
        edgeMin: 1,
        edgeMax: 3,
        secondaryCenterProb: 0.05,
        tier: ResourceTier.Tier2,
    },
];

class ResourceGenerator {
    private nDeposits: number;
    private connections: Set<NodeId>[];

    constructor(
        private seq: RandomSequence,
        private planet: GeneratedPlanet,
    ) {
        this.nDeposits = Math.floor(planet.graph.size() * (0.01 + 0.02 * seq()));
        this.connections = planet.graph.getConnections() as Set<NodeId>[];
    }

    generate() {
        for (let i = 0; i < this.nDeposits; i++) {
            const resourceData = pick(this.seq, RESOURCES);
            const randomCenterNodeIndex = drawInteger(this.seq, { min: 0, max: this.connections.length }) as NodeId;
            this.generateResourceBlob(randomCenterNodeIndex, resourceData);
        }
    }

    private generateResourceBlob(start: NodeId, resourceData: ResourceData) {
        const centers = new Set<NodeId>();
        const edges = new Set<NodeId>();

        for (const connected of this.connections[start]) {
            if (this.seq() < resourceData.secondaryCenterProb) {
                centers.add(connected);
                continue;
            }

            edges.add(connected);
        }

        for (const secondaryCenter of centers) {
            for (const connected of this.connections[secondaryCenter]) {
                if (centers.has(connected)) {
                    continue;
                }

                edges.add(connected);
            }
        }

        centers.add(start);

        for (const centerId of centers) {
            this.setResource(
                centerId,
                resourceData.resource,
                resourceData.centerMin + Math.floor((resourceData.centerMax - resourceData.centerMin) * this.seq()),
                resourceData.tier,
            );
        }

        for (const edgeId of edges) {
            this.setResource(
                edgeId,
                resourceData.resource,
                resourceData.edgeMin + Math.floor((resourceData.edgeMax - resourceData.edgeMin) * this.seq()),
                resourceData.tier,
            );
        }
    }

    private setResource(at: NodeId, resource: string, baseAmount: number, tier: ResourceTier) {
        const coeff = this.planet.landscape.getResourceScaling(at);
        if (coeff <= 0) {
            return;
        }

        this.planet.resources.add(at, resource, tier, Math.floor(coeff * baseAmount));
    }
}
