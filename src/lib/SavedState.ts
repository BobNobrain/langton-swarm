type Serializable = {
    serialize(): unknown;
    deserialize(value: unknown): void;
};

export class SavedStatePartition {
    private name = '';
    private partitions: Record<string, Serializable> = {};
    private initial: Record<string, unknown> = {};

    value<T>(name: string): SavedStateValue<T> {
        const value = this.partitions[name];

        if (!value) {
            const fresh = new SavedStateValue<T>(name);

            if (this.initial[name]) {
                fresh.deserialize(this.initial[name]);
            }

            this.partitions[name] = fresh;
            return fresh;
        }
        if (!(value instanceof SavedStateValue)) {
            throw new Error('requested a value, but a partition was found: ' + this.name + '.' + name);
        }

        return value;
    }
    hasValue(name: string) {
        return (this.partitions[name] && this.partitions[name] instanceof SavedStateValue) || this.initial[name];
    }

    partition(name: string): SavedStatePartition {
        const partition = this.partitions[name];

        if (!partition) {
            const fresh = new SavedStatePartition();
            fresh.name = name;

            if (this.initial[name]) {
                fresh.deserialize(this.initial[name]);
            }

            this.partitions[name] = fresh;
            return fresh;
        }
        if (!(partition instanceof SavedStatePartition)) {
            throw new Error('requested a partition, but a value was found: ' + this.name + '.' + name);
        }

        return partition;
    }

    serialize(): unknown {
        const result: Record<string, unknown> = {};
        for (const name of Object.keys(this.partitions)) {
            result[name] = this.partitions[name].serialize();
        }
        return result;
    }

    deserialize(json: unknown) {
        for (const [name, value] of Object.entries(json as object)) {
            const inner = this.partitions[name];

            if (!inner) {
                this.initial[name] = value;
                continue;
            }

            inner.deserialize(value);
        }
    }
}

// type Loader<T> = (value: T, version: number) => void;
type Saver<T> = () => T;

class SavedStateValue<T> {
    private value: T | null = null;
    private saver: Saver<T> | null = null;

    constructor(private name: string) {}

    onSave(callback: Saver<T>) {
        this.saver = callback;
    }

    get(defaultValue: () => T): T;
    get(defaultValue?: undefined): T | null;
    get(defaultValue?: () => T): T | null {
        return this.value ?? defaultValue?.() ?? null;
    }

    serialize() {
        if (!this.saver) {
            throw new Error('Saver not initialized: ' + this.name);
        }

        return this.saver();
    }
    deserialize(json: unknown) {
        this.value = json as T;
        console.log(this.name, json);
    }
}

export type { SavedStateValue };
