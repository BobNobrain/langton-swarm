import { createSignal, onCleanup } from 'solid-js';
import type { NavMesh } from '@/lib/NavMesh';
import { createEvent, type Event } from '@/lib/sparse';
import type { CreateGameProgressListener, NodeId, ResourceDeposit, SurfaceNode, WorldgenOptions } from './types';
import { generatePlanet } from './worldgen/planet';

type ResourceUpdateEvent = Event<(at: NodeId, dep: ResourceDeposit) => void>;

export type GameWorld = {
    readonly seed: string;

    readonly surface: SurfaceNode[];
    readonly nav: NavMesh;

    readonly resources: Map<NodeId, ResourceDeposit>;
    mineResource(at: NodeId, resource: string, amount: number): boolean;
    readonly resourceUpdate: ResourceUpdateEvent;
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
    const { nav, nodes: surface, resources } = await generatePlanet(opts, onProgress);
    onProgress?.({ progress: 1, stage: 'Done' });

    const resourceUpdate: ResourceUpdateEvent = createEvent();

    return {
        seed: opts.seed,

        surface,
        nav,

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
