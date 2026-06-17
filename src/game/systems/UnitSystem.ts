import { namedArguments, type BsmlValue, type BsmlValueType, typecheckValues } from '../program';
import type { UnitId } from '../types';
import { CPU_RETURN_MESSAGE_NAME } from './cpu/constants';
import type { UnitEventController } from './events';
import type { UnitSystemOrchestrator, SendMessage, SpawnOptions, UnitSystemFunction, UnitSystemMessage } from './types';

export type UnitEntry<Data> = {
    unitId: UnitId;
    systemData: Data;
    sleepUntil: number;
};

export type UnitSystemTickContext<Data> = {
    unitId: UnitId;
    systemData: Data;
};

export type StatefulFunctionState<T, Args extends Record<string, BsmlValue>> = {
    unitId: UnitId;
    args: Args;
} & (T | { [key in keyof T]?: undefined }); // TODO: just Partial<T>?

export type StatefulFunctionBodyResult<ReturnType extends BsmlValueType> =
    | { type: 'value'; value: Extract<BsmlValue, { type: ReturnType }>; waitTicks: number }
    | { type: 'sleep'; ticks: number };

export type StatefulFunctionCallPayload = {
    fname: string;
    argv: BsmlValue[];
    state?: StatefulFunctionState<unknown, any>;
};

type FnData<Data> = {
    argNames: string[];
    argTypes: BsmlValueType[];
    body: (
        state: StatefulFunctionState<unknown, any>,
        ctx: UnitSystemTickContext<Data>,
    ) => StatefulFunctionBodyResult<BsmlValueType>;
};

export type StatefulFnDeclaration<
    Args extends Record<string, BsmlValueType>,
    Ret extends BsmlValueType,
> = UnitSystemFunction & {
    name: string;
    args: Args;
    returnType: Ret;
};

type SaveData<Data> = {
    v: 1;
    a: UnitEntry<Data>[];
    i: UnitEntry<Data>[];
    c: unknown;
};

const FCALL_EVENT = 'fcall';

export abstract class UnitSystem<Data, SavedState = null, SavedUnitState = Data> {
    static declareFn<Args extends Record<string, BsmlValueType>, Ret extends BsmlValueType>(
        opts: Omit<StatefulFnDeclaration<Args, Ret>, 'argNames' | 'argTypes'>,
    ): StatefulFnDeclaration<Args, Ret> {
        return {
            ...opts,
            argNames: Object.keys(opts.args),
            argTypes: Object.values(opts.args),
        };
    }

    public readonly sendMessage: SendMessage;

    protected readonly activeData = new Map<UnitId, UnitEntry<Data>>();
    protected readonly inactiveData = new Map<UnitId, UnitEntry<Data>>();
    protected readonly currentTick: () => number;
    protected readonly loadedState: SavedState | null;

    private readonly fns: Record<string, FnData<Data>> = {};
    private readonly messageHandlers: Record<string, (payload: unknown, ctx: UnitSystemTickContext<Data>) => void> = {};

    constructor(
        public readonly name: string,
        protected readonly orchestrator: UnitSystemOrchestrator,
    ) {
        this.currentTick = orchestrator.logicTick.getCurrentTick;
        this.sendMessage = orchestrator.sendMessage;

        orchestrator.systems[name] = this;

        const save = orchestrator.savedState.value<SaveData<SavedUnitState>>(this.name);
        const loaded = save.get();
        this.loadedState = (loaded?.c as SavedState | null | undefined) ?? null;

        if (loaded) {
            for (const active of loaded.a) {
                this.activeData.set(active.unitId, {
                    unitId: active.unitId,
                    systemData: this.onUnitDataLoad(active.systemData),
                    sleepUntil: active.sleepUntil,
                });
            }
            for (const inactive of loaded.i) {
                this.inactiveData.set(inactive.unitId, {
                    unitId: inactive.unitId,
                    systemData: this.onUnitDataLoad(inactive.systemData),
                    sleepUntil: inactive.sleepUntil,
                });
            }
        }

        save.onSave(() => {
            const result: SaveData<SavedUnitState> = {
                v: 1,
                a: [],
                i: [],
                c: this.onSave(),
            };

            for (const active of this.activeData.values()) {
                result.a.push({
                    unitId: active.unitId,
                    systemData: this.onUnitDataSave(active.systemData),
                    sleepUntil: active.sleepUntil,
                });
            }
            for (const inactive of this.inactiveData.values()) {
                result.i.push({
                    unitId: inactive.unitId,
                    systemData: this.onUnitDataSave(inactive.systemData),
                    sleepUntil: inactive.sleepUntil,
                });
            }

            return result;
        });
    }

    tick(): void {
        const currentTick = this.currentTick();
        for (const entry of this.activeData.values()) {
            if (currentTick < entry.sleepUntil) {
                continue;
            }

            this.onTick(entry);
        }
    }

    create(unitId: UnitId, options: SpawnOptions): void {
        const initial = this.initialData(options, unitId);
        if (initial === null || initial === undefined) {
            // no need to create the entity for this system
            return;
        }

        this.activeData.set(unitId, {
            unitId,
            systemData: initial,
            sleepUntil: 0,
        });
    }

    activate(unitId: UnitId, delayTicks?: number): void {
        let entry = this.inactiveData.get(unitId);
        if (!entry && delayTicks === undefined) {
            return;
        }

        if (!entry) {
            entry = this.activeData.get(unitId);
        } else {
            this.inactiveData.delete(unitId);
        }

        if (!entry) {
            return;
        }

        this.activeData.set(unitId, entry);
        if (delayTicks !== undefined) {
            entry.sleepUntil = this.currentTick() + delayTicks;
        }
    }
    deactivate(unitId: UnitId): void {
        const entry = this.activeData.get(unitId);
        if (!entry) {
            return;
        }

        this.activeData.delete(unitId);
        this.inactiveData.set(unitId, entry);
    }
    remove(unitId: UnitId): void {
        const unitData = this.activeData.get(unitId) ?? this.inactiveData.get(unitId) ?? null;
        if (unitData === null) {
            return;
        }
        this.onFinalize(unitData);

        this.activeData.delete(unitId);
        this.inactiveData.delete(unitId);
    }

    has(unitId: UnitId): boolean {
        return this.activeData.has(unitId) || this.inactiveData.has(unitId);
    }
    getData(unitId: UnitId): Data | null {
        const entry = this.activeData.get(unitId) ?? this.inactiveData.get(unitId);
        return entry ? entry.systemData : null;
    }

    handleMessage(msg: UnitSystemMessage): void {
        if (msg.event === FCALL_EVENT) {
            const payload = msg.payload as StatefulFunctionCallPayload;
            const fn = this.fns[payload.fname];
            if (!fn) {
                console.error('this function does not exist!', { system: this.name, msg });
                return;
            }

            this.handleFunction(payload, fn, msg.unitId);
            return;
        }

        const handler = this.messageHandlers[msg.event];
        if (!handler) {
            return;
        }

        const activeData = this.activeData.get(msg.unitId);
        const unitData = activeData ?? this.inactiveData.get(msg.unitId);

        if (!unitData) {
            return;
        }

        handler(msg.payload, unitData);
    }

    protected sleep(unitId: UnitId, ticksFor?: number) {
        let entry = this.activeData.get(unitId);
        let active = true;
        if (!entry) {
            entry = this.inactiveData.get(unitId)!;
            active = false;
        }

        if (ticksFor === undefined || ticksFor < 0 || ticksFor === Infinity) {
            if (active) {
                this.activeData.delete(unitId);
                this.inactiveData.set(entry.unitId, entry);
            }

            entry.sleepUntil = 0;
            return;
        }

        entry.sleepUntil = this.currentTick() + ticksFor;
    }

    protected registerFn<Args extends Record<string, BsmlValueType>, Ret extends BsmlValueType>(
        decl: StatefulFnDeclaration<Args, Ret>,
    ) {
        // dancing around typescript generics and automatic type inferring
        // maybe there's a better way to do it, but I don't care for now
        return {
            implement: <State>(
                body: (
                    state: StatefulFunctionState<
                        State,
                        { [key in keyof Args]: Extract<BsmlValue, { type: Args[key] }> }
                    >,
                    ctx: UnitSystemTickContext<Data>,
                ) => StatefulFunctionBodyResult<Ret>,
            ) => {
                this.fns[decl.name] = {
                    argNames: decl.argNames,
                    argTypes: decl.argTypes,
                    body: body as never,
                };
            },
        };
    }

    protected registerMessageHandler<Payload>(
        event: string,
        handler: (payload: Payload, ctx: UnitSystemTickContext<Data>) => void,
    ) {
        this.messageHandlers[event] = handler as never;
    }
    protected registerEvent(evt: UnitEventController) {
        this.orchestrator.events.push(evt);
    }

    protected abstract initialData(options: SpawnOptions, unitId: UnitId): Data | null;
    protected onTick(ctx: UnitSystemTickContext<Data>) {}
    protected onFinalize(ctx: UnitSystemTickContext<Data>): void {}
    protected onSave(): SavedState | null {
        return null;
    }
    protected onUnitDataSave(data: Data): SavedUnitState {
        return data as unknown as SavedUnitState;
    }
    protected onUnitDataLoad(saved: SavedUnitState): Data {
        return saved as unknown as Data;
    }

    protected fcall(unitId: UnitId, system: string, fname: string, argv: BsmlValue[]) {
        const payload: StatefulFunctionCallPayload = { fname, argv };
        this.sendMessage(system, {
            event: FCALL_EVENT,
            unitId,
            payload,
        });
    }

    private handleFunction(payload: StatefulFunctionCallPayload, fn: FnData<Data>, unitId: UnitId) {
        const entry = this.activeData.get(unitId) ?? this.inactiveData.get(unitId);
        if (!entry) {
            console.error('unit not found', { unitId, system: this.name, payload });
            return;
        }

        if (!payload.state) {
            const args = namedArguments(fn.argNames, payload.argv);
            const err = typecheckValues(payload.argv, fn);
            if (err) {
                console.error('function typecheck failed:', { system: this.name, unitId, payload, err });
                return;
            }

            payload.state = { unitId, args };
        }

        const result = fn.body(payload.state, entry);
        switch (result.type) {
            case 'value':
                this.sendMessage(
                    'cpu',
                    {
                        event: CPU_RETURN_MESSAGE_NAME,
                        unitId,
                        payload: {
                            value: result.value,
                        },
                    },
                    result.waitTicks,
                );
                break;

            case 'sleep':
                this.sendMessage(
                    this.name,
                    {
                        event: FCALL_EVENT,
                        unitId,
                        payload,
                    },
                    result.ticks,
                );
                break;
        }
    }
}

export function fnSleep(ticksFor = 1): StatefulFunctionBodyResult<never> {
    return { type: 'sleep', ticks: ticksFor };
}
export function fnReturn<Ret extends BsmlValueType>(
    val: Extract<BsmlValue, { type: Ret }>,
    waitTicks = 0,
): StatefulFunctionBodyResult<Ret> {
    return { type: 'value', value: val, waitTicks };
}
