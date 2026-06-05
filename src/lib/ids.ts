export type ID<T extends string | number, Tag extends string> = string extends Tag ? never : T & { __idTag__: Tag };

export function sequentialId<ID extends number>(
    initial = 1,
): {
    aquire(): ID;
    lock(id: ID): void;
} {
    let idSeq = initial;

    return {
        aquire() {
            return idSeq++ as ID;
        },

        lock(id: ID) {
            idSeq = Math.max(id + 1, idSeq);
        },
    };
}
