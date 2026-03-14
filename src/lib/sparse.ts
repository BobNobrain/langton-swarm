export type SparseCollection<T> = {
    add(item: T): number;
    delete(id: number): void;
    clear(): void;
    all(): Iterable<T>;
};

export function createSparseCollection<T>(): SparseCollection<T> {
    const itemsById = new Map<number, T>();
    let idSeq = 0;

    return {
        all: () => itemsById.values(),
        add(f) {
            const id = idSeq;
            ++idSeq;
            itemsById.set(id, f);
            return id;
        },
        delete(id) {
            itemsById.delete(id);
        },
        clear() {
            itemsById.clear();
        },
    };
}

export type Event<Listener extends (...args: never[]) => unknown> = {
    on(f: Listener): number;
    off(id: number): void;
    trigger(...args: Parameters<Listener>): void;
};

export function createEvent<Listener extends (...args: never[]) => unknown>(): Event<Listener> {
    const listeners = createSparseCollection<Listener>();

    return {
        on: (listener) => listeners.add(listener),
        off(id) {
            listeners.delete(id);
        },
        trigger(...args) {
            for (const listener of listeners.all()) {
                listener(...args);
            }
        },
    };
}
