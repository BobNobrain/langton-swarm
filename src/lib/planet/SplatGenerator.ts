import { drawInteger, type RandomSequence } from '../random';
import type { PlanetGraph } from './PlanetGraph';

export class SplatGenerator {
    constructor(private graph: PlanetGraph) {}

    generate(seq: RandomSequence, size: number): Set<number> {
        const connections = this.graph.getConnections();
        const start = drawInteger(seq, { min: 0, max: this.graph.size() });
        const splat = new Set([start]);

        const candidates = new Map<number, number>();
        for (const nbor of connections[start]) {
            candidates.set(nbor, 1);
        }

        let probSum = candidates.size;

        while (splat.size < size) {
            let acc = 0;
            let r = seq() * probSum;

            for (const [vi, d] of candidates.entries()) {
                const prob = 1 / d;
                acc += prob;

                if (acc < r) {
                    continue;
                }

                splat.add(vi);
                candidates.delete(vi);
                probSum -= prob;

                const nbors = connections[vi];
                for (const nbor of nbors) {
                    if (splat.has(nbor) || candidates.has(nbor)) {
                        continue;
                    }

                    candidates.set(nbor, d + 1);
                    probSum += 1 / (d + 1);
                }

                break;
            }

            if (acc < r) {
                throw new Error('randomness gone wrong');
            }
        }

        return splat;
    }
}
