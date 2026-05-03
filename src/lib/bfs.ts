type QueueItem<NId> = { node: NId; depth: number };

export class BFS<NId extends number = number> {
    private queue: QueueItem<NId>[] = [];
    private visited = new Map<NId, number>();
    private queued = new Set<NId>();

    constructor(
        start: NId,
        private connections: NId[][],
    ) {
        this.queue.push({ node: start, depth: 0 });
        this.queued.add(start);
    }

    isDone(): boolean {
        return this.queue.length === 0;
    }

    nextNodeToVisit(): QueueItem<NId> {
        return this.queue[0];
    }

    expand() {
        const next = this.queue.shift()!;
        this.visited.set(next.node, next.depth);
        this.queued.delete(next.node);

        const nbors = this.connections[next.node];
        const depth = next.depth + 1;
        for (const nbor of nbors) {
            if (this.visited.has(nbor) || this.queued.has(nbor)) {
                continue;
            }

            this.queue.push({ node: nbor, depth });
            this.queued.add(nbor);
        }

        return next;
    }

    expandLayer() {
        const result: { depth: number; nodes: NId[] } = {
            depth: this.queue[0].depth,
            nodes: [],
        };

        while (this.queue.length) {
            const next = this.queue[0];
            if (next.depth !== result.depth) {
                break;
            }

            this.expand();
            result.nodes.push(next.node);
        }

        return result;
    }

    expandToDepth(depth: number) {
        while (this.queue.length) {
            const next = this.queue[0];
            if (next.depth > depth) {
                break;
            }

            this.expand();
        }
    }

    getVisited() {
        return this.visited;
    }
}
