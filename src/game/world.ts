import { Vector3 } from 'three';
import { NavMesh } from '@/lib/NavMesh';
import type { Landscape } from '@/lib/planet/Landscape';
import type { PlanetGraph } from '@/lib/planet/PlanetGraph';
import { createEvent, type Event } from '@/lib/sparse';
import type { CreateGameProgressListener, NodeId, SurfaceNode, WorldgenOptions } from './types';
import { generatePlanet, loadPlanet, setupPlanetSaving } from './worldgen/planet';
import type { RawVertex } from '@/lib/3d';
import type { GameLoop } from './loop';
import type { PlanetaryResources } from './resources';
import type { SavedStatePartition, SavedStateValue } from '@/lib/SavedState';
import type { GeneratedPlanet } from './worldgen/types';

type FogOfWarUpdateEvent = Event<(nodes: Set<NodeId>, status: 'forgotten' | 'discovered') => void>;

export type GameWorld = {
    readonly seed: string;
    readonly spawnLocation: NodeId;

    readonly radius: number;
    readonly surface: SurfaceNode[];
    readonly graph: PlanetGraph;
    readonly landscape: Landscape;
    readonly nav: NavMesh;

    readonly terraIncognita: Set<NodeId>;
    readonly terraIncognitaUpdate: FogOfWarUpdateEvent;
    forgetNodes(nodes: Set<NodeId>): void;
    discoverNodes(nodes: Set<NodeId>): void;

    readonly resources: PlanetaryResources;

    readonly sunPosition: RawVertex;
    readonly dayLengthTicks: number;
};

type SaveData = {
    v: 1;
    seed: string;
    terraIncognita: NodeId[];
};

export async function createGameWorld(
    loop: GameLoop,
    opts: WorldgenOptions,
    onProgress: CreateGameProgressListener | undefined,
    savedState: SavedStatePartition,
): Promise<GameWorld> {
    let planet: GeneratedPlanet;
    if (savedState.hasValue('planet')) {
        planet = loadPlanet(savedState.value('planet'));
    } else {
        planet = await generatePlanet(opts, onProgress);
    }

    setupPlanetSaving(planet, savedState.value('planet'));

    const { resources, radius, spawnLocation, graph, landscape } = planet;
    onProgress?.({ progress: 1, stage: 'Done' });

    const worldState = savedState.value<SaveData>('stats');
    const loaded = worldState.get(() => ({
        v: 1 as const,
        seed: opts.seed,
        terraIncognita: new Array(graph.size()).fill(0).map((_, vi) => vi as NodeId),
    }));

    const surface = new Array<SurfaceNode>(graph.size());
    const coords = graph.coords();
    const connections = graph.getConnections();
    const terraIncognita = new Set<NodeId>(loaded.terraIncognita);
    const elevations = landscape.getBaseElevations();

    for (let vi = 0 as NodeId; vi < graph.size(); vi++) {
        surface[vi] = {
            index: vi,
            position: new Vector3(...coords[vi]),
            connections: connections[vi] as Set<NodeId>,
            elevation: elevations[vi],
        };
        surface[vi].position.normalize().multiplyScalar(radius + elevations[vi]);
    }

    const terraIncognitaUpdate: FogOfWarUpdateEvent = createEvent();

    const dayLengthTicks = 1_000;
    let sunPosition: [number, number, number] = [0, 0, 0];
    initSun(loop, sunPosition, { height: 0.2, period: dayLengthTicks });

    worldState.onSave(() => {
        return { v: 1 as const, seed: loaded.seed, terraIncognita: Array.from(terraIncognita) };
    });

    return {
        seed: loaded.seed,
        spawnLocation: spawnLocation,

        radius,
        surface,
        nav: new NavMesh(coords, landscape.buildNavigationConnections()),
        graph,
        landscape,

        sunPosition,
        dayLengthTicks,

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
    };
}

function initSun(
    loop: GameLoop,
    pos: [number, number, number],
    opts: {
        height: number;
        period: number;
    },
) {
    const SUN_SPEED = Math.PI / opts.period; // 1 rpm

    pos[1] = opts.height;

    loop.addGameTask((t) => {
        pos[0] = Math.cos(t * SUN_SPEED);
        pos[2] = Math.sin(t * SUN_SPEED);
    });
}
