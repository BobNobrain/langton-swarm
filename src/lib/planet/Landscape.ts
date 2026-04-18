import { drawInteger, pick, randomElement, type RandomSequence } from '../random';
import type { PlanetGraph } from './PlanetGraph';
import { SplatGenerator } from './SplatGenerator';

export type LandscapeGenerateOptions = {
    seq: RandomSequence;
    minSplats: number;
    maxSplats: number;
    maxElevation: number;
};

export enum Biome {
    Regolith,
    Basalt,
    Lava,
}

export class Landscape {
    private elevations: number[] = [];
    private biomes: Biome[] = [];
    private bridges = new Map<number, number>();

    constructor(private graph: PlanetGraph) {
        const size = graph.size();
        this.elevations = new Array(size).fill(0);
        this.biomes = new Array(size).fill(Biome.Regolith);
    }

    getBaseElevations(): readonly number[] {
        return this.elevations;
    }
    getMaterialIndicies(): readonly number[] {
        return this.biomes;
    }
    getBridges(): [number, number][] {
        return Array.from(this.bridges.entries());
    }

    generateLandscape(opts: LandscapeGenerateOptions) {
        const nSplats = drawInteger(opts.seq, { min: opts.minSplats, max: opts.maxSplats });
        const maxSplatSize = this.elevations.length / nSplats;
        const splatGenerator = new SplatGenerator(this.graph);
        const connections = this.graph.getConnections();

        for (let i = 0; i < nSplats; i++) {
            const splatSize = drawInteger(opts.seq, { min: 0.1 * maxSplatSize, max: 0.8 * maxSplatSize });
            const { splat, maxD, outline } = splatGenerator.generate(opts.seq, splatSize);

            for (const [vi, d] of splat.entries()) {
                this.elevations[vi] += 1;
                this.biomes[vi] = Biome.Basalt;

                if (d < maxD / 5 && opts.seq() < 0.7) {
                    this.biomes[vi] = Biome.Regolith;
                }
            }
            for (const vi of outline.keys()) {
                this.biomes[vi] = Biome.Basalt;
            }

            const nBridges = Math.max(1, Math.floor(outline.size * 0.05));
            const outlineTiles = Array.from(outline.keys());
            const hasABridge = new Set<number>();

            for (let i = 0; i < nBridges; i++) {
                const tileA = pick(opts.seq, outlineTiles);
                if (hasABridge.has(tileA)) {
                    continue;
                }

                hasABridge.add(tileA);
                const possibleBs: number[] = [];
                for (const nbor of connections[tileA]) {
                    if (hasABridge.has(nbor) || !splat.has(nbor)) {
                        continue;
                    }
                    possibleBs.push(nbor);
                }

                if (!possibleBs.length) {
                    continue;
                }

                const tileB = pick(opts.seq, possibleBs);
                hasABridge.add(tileB);
                this.bridges.set(Math.min(tileA, tileB), Math.max(tileA, tileB));
            }
        }

        for (let vi = 0; vi < this.elevations.length; vi++) {
            this.elevations[vi] = Math.min(this.elevations[vi], opts.maxElevation);
        }
    }

    buildNavigationConnections(): Set<number>[] {
        const result: Set<number>[] = new Array(this.elevations.length);
        const allConnections = this.graph.getConnections();

        for (let ti = 0; ti < this.elevations.length; ti++) {
            const ics = new Set<number>();
            const elev = this.elevations[ti];

            for (const nbor of allConnections[ti]) {
                if (this.elevations[nbor] === elev || this.bridges.get(Math.min(nbor, ti)) === Math.max(nbor, ti)) {
                    ics.add(nbor);
                }
            }

            result[ti] = ics;
        }

        return result;
    }
}
