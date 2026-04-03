import { createSignal, onCleanup } from 'solid-js';
import type { NavMesh } from '@/lib/NavMesh';
import type { CreateGameProgressListener, NodeId, ResourceDeposit, SurfaceNode, WorldgenOptions } from './types';
import { generatePlanet } from './worldgen/planet';

export type GameWorld = {
    readonly seed: string;

    readonly surface: SurfaceNode[];
    readonly nav: NavMesh;

    readonly resources: Map<NodeId, ResourceDeposit>;
    mineResource(at: NodeId, resource: string, amount: number): boolean;
    createResourceSignal(location: NodeId): () => ResourceDeposit | null;
};

type ResourceSignal = {
    get: () => ResourceDeposit | null;
    set: (val: ResourceDeposit | null) => void;
    uses: number;
};

export async function createGameWorld(
    opts: WorldgenOptions,
    onProgress: CreateGameProgressListener | undefined,
): Promise<GameWorld> {
    const resourceSignals = new Map<NodeId, ResourceSignal>();
    const { nav, nodes: surface, resources } = await generatePlanet(opts, onProgress);
    onProgress?.({ progress: 1, stage: 'Done' });

    return {
        seed: opts.seed,

        surface,
        nav,

        resources,
        mineResource(at, resource, amount) {
            const deposit = resources.get(at);
            if (!deposit || deposit.resource !== resource || deposit.amount < amount) {
                return false;
            }

            deposit.amount -= amount;
            return true;
        },
        createResourceSignal(location) {
            const existing = resourceSignals.get(location);
            if (existing) {
                ++existing.uses;
                return existing.get;
            }

            const [get, set] = createSignal(resources.get(location) ?? null);
            resourceSignals.set(location, { get, set, uses: 1 });
            onCleanup(() => {
                const signal = resourceSignals.get(location);
                if (!signal) {
                    return;
                }

                --signal.uses;
                if (signal.uses <= 0) {
                    resourceSignals.delete(location);
                }
            });
            return get;
        },
    };
}
