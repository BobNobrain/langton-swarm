export type ID<T extends string | number, Tag extends string> = string extends Tag ? never : T & { __idTag__: Tag };

export function sequentialId<ID extends number>(): {
    aquire: () => ID;
} {
    let idSeq = 1;

    return {
        aquire() {
            return idSeq++ as ID;
        },
    };
}
