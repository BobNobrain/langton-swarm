import { drawInteger, pick, type RandomSequence } from '../random';
import type { PlanetGraph } from './PlanetGraph';

type River = {
    river: Set<number>;
    banks: Set<number>;
};

export class RiverGenerator {
    readonly rivers: River[] = [];
    private connections: Set<number>[];

    constructor(
        private seq: RandomSequence,
        graph: PlanetGraph,
        private elevations: readonly number[],
    ) {
        this.connections = graph.getConnections();
    }

    generate(opts: { minSize: number; maxSize: number }) {
        const seq = this.seq;
        const banks = new Set<number>();
        const river = new Set<number>();
        const riverSize = drawInteger(seq, { min: opts.minSize, max: opts.maxSize });

        let current = drawInteger(seq, { min: 0, max: this.connections.length });

        while (river.size < riverSize) {
            river.add(current);
            const next = this.pickNextFlowPoint(banks, river, current);
            const nbors = this.connections[current];

            for (const nbor of nbors) {
                if (nbor === next || river.has(nbor)) {
                    continue;
                }

                banks.add(nbor);
            }

            if (next === null) {
                break;
            }

            current = next;
        }

        if (!river.has(current)) {
            banks.add(current);
        }

        this.rivers.push({ river, banks });
    }

    private pickNextFlowPoint(banks: Set<number>, river: Set<number>, current: number) {
        const nbors = this.connections[current];
        let minElevation = this.elevations[current];
        const candidates: number[] = [];

        for (const nbor of nbors) {
            if (banks.has(nbor) || river.has(nbor)) {
                continue;
            }

            candidates.push(nbor);
            minElevation = Math.min(minElevation, this.elevations[nbor]);
        }

        for (let i = 0; i < candidates.length; i++) {
            if (this.elevations[candidates[i]] > minElevation) {
                candidates.splice(i, 1);
                --i;
                continue;
            }
        }

        if (!candidates.length) {
            return null;
        }

        return pick(this.seq, candidates);
    }
}
