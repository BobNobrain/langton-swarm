import { GAME_VERSION, type GameVersion } from './version';

export type GameSaveMetadata = {
    id: number;
    date: Date;
    worldSeed: string;
    worldSize: number;
    gameVersion: GameVersion;
    saveId: number;
};

export type GameSaveCreatePayload = {
    worldSeed: string;
    worldSize: number;
    data: unknown;
};

type GameSaveData = {
    id: number;
    save: unknown;
};

const DB_NAME = 'saves';
const DB_VERSION = 1;

enum ObjectStore {
    SavesMeta = 'saves_meta',
    Saves = 'saves',
}

export async function loadSaveList() {
    const db = await openSavesDB();
    const list = await readAllSavesMetadata(db);
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
}

export async function createSave({ worldSize, worldSeed, data }: GameSaveCreatePayload) {
    const db = await openSavesDB();
    return writeSave(
        db,
        {
            date: new Date(),
            gameVersion: GAME_VERSION,
            worldSeed,
            worldSize,
        },
        { save: data },
    );
}

export async function retrieveSaveData(saveId: number): Promise<unknown> {
    const db = await openSavesDB();
    return (await readSave(db, saveId))?.save ?? null;
}

export async function deleteSave(save: GameSaveMetadata): Promise<void> {
    const db = await openSavesDB();
    return deleteSaveEntries(db, save);
}

function openSavesDB() {
    const rq = window.indexedDB.open(DB_NAME, DB_VERSION);

    rq.onupgradeneeded = (ev) => {
        // TODO: create the DB
        const db = getResult<IDBDatabase>(ev)!;
        db.createObjectStore(ObjectStore.SavesMeta, { keyPath: 'id', autoIncrement: true });
        db.createObjectStore(ObjectStore.Saves, { keyPath: 'id', autoIncrement: true });
    };

    return new Promise<IDBDatabase>((resolve, reject) => {
        rq.onerror = reject;
        rq.onblocked = () => reject(new Error('Another opened tab is holding your save list hostage!'));
        rq.onsuccess = (ev) => resolve(getResult<IDBDatabase>(ev)!);
    });
}

function readAllSavesMetadata(db: IDBDatabase) {
    const rq = db.transaction([ObjectStore.SavesMeta], 'readonly').objectStore(ObjectStore.SavesMeta).getAll();
    return new Promise<GameSaveMetadata[]>((resolve, reject) => {
        rq.onsuccess = (ev) => {
            resolve(getResult(ev) ?? []);
        };
        rq.onerror = reject;
    });
}

function writeSave(db: IDBDatabase, meta: Omit<GameSaveMetadata, 'id' | 'saveId'>, save: Omit<GameSaveData, 'id'>) {
    const tx = db.transaction([ObjectStore.SavesMeta, ObjectStore.Saves], 'readwrite');
    const addSaveRq = tx.objectStore(ObjectStore.Saves).add(save);

    addSaveRq.onsuccess = (ev) => {
        const saveId = getResult<number>(ev)!;
        const metadata: Omit<GameSaveMetadata, 'id'> = { ...meta, saveId };
        tx.objectStore(ObjectStore.SavesMeta).add(metadata);
    };

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = reject;
    });
}

function readSave(db: IDBDatabase, saveId: number) {
    const rq = db.transaction([ObjectStore.Saves], 'readonly').objectStore(ObjectStore.Saves).get(saveId);
    return new Promise<GameSaveData | null>((resolve, reject) => {
        rq.onsuccess = (ev) => {
            resolve(getResult<GameSaveData>(ev) ?? null);
        };
        rq.onerror = reject;
    });
}

function deleteSaveEntries(db: IDBDatabase, save: GameSaveMetadata) {
    const tx = db.transaction([ObjectStore.Saves, ObjectStore.SavesMeta], 'readwrite');
    const deleteSaveRq = tx.objectStore(ObjectStore.Saves).delete(save.saveId);
    deleteSaveRq.onsuccess = () => {
        tx.objectStore(ObjectStore.SavesMeta).delete(save.id);
    };

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = reject;
    });
}

function getResult<T>(ev: Event) {
    return (ev.target as { result?: T }).result;
}
