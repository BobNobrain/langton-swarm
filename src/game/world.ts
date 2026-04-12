import { createSignal, onCleanup } from 'solid-js';
import { NavMesh } from '@/lib/NavMesh';
import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { createEvent, type Event } from '@/lib/sparse';
import type { CreateGameProgressListener, NodeId, ResourceDeposit, SurfaceNode, WorldgenOptions } from './types';
import { generatePlanet } from './worldgen/planet';
import { Vector3 } from 'three';

type ResourceUpdateEvent = Event<(at: NodeId, dep: ResourceDeposit) => void>;
type FogOfWarUpdateEvent = Event<(nodes: Set<NodeId>, status: 'forgotten' | 'discovered') => void>;

export type GameWorld = {
    readonly seed: string;
    readonly spawnLocation: NodeId;

    readonly radius: number;
    readonly surface: SurfaceNode[];
    readonly graph: PlanetGraph;
    readonly nav: NavMesh;

    readonly terraIncognita: Set<NodeId>;
    readonly terraIncognitaUpdate: FogOfWarUpdateEvent;
    forgetNodes(nodes: Set<NodeId>): void;
    discoverNodes(nodes: Set<NodeId>): void;

    readonly resources: Map<NodeId, ResourceDeposit>;
    mineResource(at: NodeId, resource: string, amount: number): boolean;
    readonly resourceUpdate: ResourceUpdateEvent;
};

export async function createGameWorld(
    opts: WorldgenOptions,
    onProgress: CreateGameProgressListener | undefined,
): Promise<GameWorld> {
    const { resources, radius, spawnLocation, graph, elevations } = await generatePlanet(opts, onProgress);
    onProgress?.({ progress: 1, stage: 'Done' });

    const resourceUpdate: ResourceUpdateEvent = createEvent();

    const surface = new Array<SurfaceNode>(graph.size());
    const coords = graph.coords();
    const connections = graph.getConnections();
    const terraIncognita = new Set<NodeId>();
    for (let vi = 0 as NodeId; vi < graph.size(); vi++) {
        terraIncognita.add(vi);
        surface[vi] = {
            index: vi,
            position: new Vector3(...coords[vi]),
            connections: connections[vi] as Set<NodeId>,
            elevation: elevations[vi],
        };
        surface[vi].position.normalize().multiplyScalar(radius + elevations[vi]);
    }

    const terraIncognitaUpdate: FogOfWarUpdateEvent = createEvent();

    return {
        seed: opts.seed,
        spawnLocation: spawnLocation,

        radius,
        surface,
        nav: new NavMesh(coords, connections),
        graph,

        terraIncognita,
        terraIncognitaUpdate: terraIncognitaUpdate,
        forgetNodes(nodes) {
            const oldSize = terraIncognita.size;

            for (const n of nodes) {
                terraIncognita.add(n);
            }

            if (terraIncognita.size !== oldSize) {
                terraIncognitaUpdate.trigger(nodes, 'forgotten');
            }
        },
        discoverNodes(nodes) {
            const oldSize = terraIncognita.size;

            for (const n of nodes) {
                terraIncognita.delete(n);
            }

            if (terraIncognita.size !== oldSize) {
                terraIncognitaUpdate.trigger(nodes, 'discovered');
            }
        },

        resources,
        resourceUpdate,
        mineResource(at, resource, amount) {
            const deposit = resources.get(at);
            if (!deposit || deposit.resource !== resource || deposit.amount < amount) {
                return false;
            }

            deposit.amount -= amount;
            resourceUpdate.trigger(at, deposit);
            return true;
        },
    };
}
