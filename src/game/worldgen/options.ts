import type { WorldgenOptions, WorldgenOptionsInput } from '../types';

const DEFAULT_SEED = 'deadmouse';

export function fillDefaults(opts: WorldgenOptionsInput | undefined): WorldgenOptions {
    return {
        seed: opts?.seed ?? DEFAULT_SEED,
        minSplats: opts?.minSplats ?? 7,
        maxSplats: opts?.maxSplats ?? 20,
        maxElevation: opts?.maxElevation ?? 3,
    };
}
