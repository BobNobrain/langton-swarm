import type { RawVertex } from '../3d';

type Item<T> = {
    value: T;
    coords: RawVertex;
};

type TreeBranch<T> = {
    x: number;
    y: number;
    z: number;

    readonly quadrants: TreeNode<T>[];
    items?: undefined;
};

type TreeLeaf<T> = {
    items: Item<T>[];
};

type TreeNode<T> = TreeBranch<T> | TreeLeaf<T>;

const MAX_ITEMS = 20;

export class OctoTree<T> {
    private root: TreeNode<T>;
    private unbalancedInserts = 0;
    private unbanancedInsertsLimit = MAX_ITEMS;

    constructor() {
        this.root = { items: [] };
    }

    insert(value: T, coords: RawVertex) {
        findLeaf(this.root, coords).items.push({ value, coords });
        ++this.unbalancedInserts;

        if (this.unbalancedInserts >= this.unbanancedInsertsLimit) {
            this.root = rebalance(this.root);
            this.unbalancedInserts = 0;
            this.unbanancedInsertsLimit += MAX_ITEMS;
        }
    }

    delete(value: T, coords: RawVertex) {
        const items = findLeaf(this.root, coords).items;

        for (let i = 0; i < items.length; i++) {
            if (items[i].value === value) {
                items.splice(i, 1);
                return;
            }
        }
    }

    getFirstCloseEnough(coords: RawVertex, eps = 0): T | null {
        const items = findLeaf(this.root, coords).items;

        const [tx, ty, tz] = coords;
        for (const item of items) {
            const [x, y, z] = item.coords;
            const mDist = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tz - z);
            if (mDist <= eps) {
                return item.value;
            }
        }

        return null;
    }

    clear() {
        this.root = { items: [] };
    }
}

function getQuadrantIndex<T>(branch: TreeBranch<T>, [x, y, z]: RawVertex) {
    const sx = x < branch.x ? 0 : 1;
    const sy = y < branch.y ? 0 : 1;
    const sz = z < branch.z ? 0 : 1;
    return sx + 2 * sy + 4 * sz;
}

function split<T>(node: TreeLeaf<T>): TreeBranch<T> {
    let mx = 0,
        my = 0,
        mz = 0;

    for (const item of node.items) {
        const [x, y, z] = item.coords;
        mx += x;
        my += y;
        mz += z;
    }

    mx /= node.items.length;
    my /= node.items.length;
    mz /= node.items.length;

    const quadrants: TreeLeaf<T>[] = [];
    for (let i = 0; i < 8; i++) {
        quadrants.push({ items: [] });
    }

    const branch: TreeBranch<T> = {
        x: mx,
        y: my,
        z: mz,
        quadrants,
    };

    for (const item of node.items) {
        quadrants[getQuadrantIndex(branch, item.coords)].items.push(item);
    }

    return branch;
}

type NodePtr<T> = {
    qs: TreeNode<T>[];
    i: number;
};

function rebalance<T>(node: TreeNode<T>): TreeNode<T> {
    const result = [node];
    const unbalancedQueue: NodePtr<T>[] = [{ qs: result, i: 0 }];

    while (unbalancedQueue.length) {
        const { qs, i } = unbalancedQueue.shift()!;
        const next = qs[i];

        if (!next.items) {
            unbalancedQueue.push(
                ...Array.from({ length: next.quadrants.length })
                    .fill(null)
                    .map((_, i) => ({ qs: next.quadrants, i })),
            );
            continue;
        }

        if (next.items.length < MAX_ITEMS) {
            continue;
        }

        const subtree = split(next);
        qs[i] = subtree;
        unbalancedQueue.push(
            ...Array.from({ length: subtree.quadrants.length })
                .fill(null)
                .map((_, i) => ({ qs: subtree.quadrants, i })),
        );
    }

    return result[0];
}

function findLeaf<T>(node: TreeNode<T>, coords: RawVertex): TreeLeaf<T> {
    let cursor = node;

    while (!cursor.items) {
        cursor = cursor.quadrants[getQuadrantIndex(cursor, coords)];
    }

    return cursor;
}
