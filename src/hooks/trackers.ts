import { createMemo, createSignal } from 'solid-js';
import type { NodeId, UnitId, InventoryData, BsmlValue } from '@/game';
import type { CompiledProgram } from '@/game/program/compile';
import { renderStateName } from '@/game/program/utils';
import type { AssemblerData } from '@/game/systems';
import { useGame } from '@/gameContext';
import { onTickConditional } from '@/hooks/onTick';
import { createUnitEventListener } from './events';
import type { UnitEventData } from '@/game/systems/events';

export type UnitStatusTracker = {
    rStateName: () => string;
    rHealth: () => number;
    rEnergy: () => number;
    rLocation: () => NodeId | null;
};

const ENERGY_PRECISION = 0.01;
const ENERGY_PRECISION_INV = 100;

export function createUnitTracker(unitId: () => UnitId | null): UnitStatusTracker {
    const { units } = useGame();
    const [rStateName, rSetStateName] = createSignal(renderStateName(null));
    const [rHealth, rSetHealth] = createSignal(1);

    const [rEnergy, rSetEnergy] = createSignal(1);
    let energyLastChecked = -1;

    const [rLocation, rSetLocation] = createSignal<NodeId | null>(null);

    onTickConditional(unitId, (uid) => () => {
        rSetLocation(units.unitStates[uid]?.location ?? null);

        const cpu = units.cpu.getData(uid);
        rSetStateName(renderStateName(cpu?.state));

        const energy = units.energy.getData(uid);
        if (energy && energy.lastUpdated > energyLastChecked) {
            energyLastChecked = energy.lastUpdated;
            rSetEnergy(Math.round((energy.charge / energy.capacity) * ENERGY_PRECISION_INV) * ENERGY_PRECISION);
        }
    });

    return {
        rStateName,
        rHealth,
        rEnergy,
        rLocation,
    };
}

const NO_INVENTORY: InventoryData = {
    capacity: 0,
    size: 0,
    contents: {},
    lastUpdated: 0,
    shouldDespawnWhenEmpty: false,
};

export function createInventoryTracker(unitId: () => UnitId | null) {
    const { units } = useGame();
    const [rInventory, rSetInventory] = createSignal(NO_INVENTORY);
    let lastUpdated = -1;
    let lastUnitId: UnitId | null = null;

    onTickConditional(unitId, (uid) => () => {
        const inv = units.inventory.getInfo(uid);

        if (!inv) {
            if (lastUpdated >= 0) {
                lastUpdated = -1;
                rSetInventory(NO_INVENTORY);
            }

            return;
        }

        if (lastUpdated < inv.lastUpdated || lastUnitId !== uid) {
            rSetInventory({ ...inv });
            lastUpdated = inv.lastUpdated;
            lastUnitId = uid;
        }
    });

    return rInventory;
}

export function createCPUStateTracker(unitId: () => UnitId | null) {
    const { units } = useGame();

    let lastUpdated = -1;
    const [rCpuStack, setCpuStack] = createSignal<BsmlValue[]>([]);
    const [rCpuPtr, setCpuPtr] = createSignal(0);
    const [rStateName, setStateName] = createSignal<string | null>(null);
    const [rCpuIsWaiting, setCpuIsWaiting] = createSignal(false);

    let unitIdForProgram: UnitId | null = null;
    const [rCpuProgram, setCpuProgram] = createSignal<CompiledProgram | null>(null);

    onTickConditional(unitId, (unitId) => () => {
        const cpu = units.cpu.getData(unitId);

        if (!cpu) {
            if (lastUpdated > 0) {
                setCpuStack([]);
                setCpuPtr(0);
                setStateName(null);
                setCpuProgram(null);
                setCpuIsWaiting(false);
            }

            return;
        }

        if (unitId !== unitIdForProgram) {
            setCpuProgram(cpu.program);
        }

        if (lastUpdated >= cpu.lastUpdated) {
            return;
        }

        setCpuStack(cpu.stack.slice());
        setCpuPtr(cpu.ptr >= cpu.program.stateInstructions[cpu.state].length ? 0 : cpu.ptr);
        setStateName(cpu.state);
        setCpuIsWaiting(cpu.isWaitingForReturn);
        lastUpdated = cpu.lastUpdated;
    });

    return {
        rCpuStack,
        rCpuPtr,
        rStateName,
        rCpuIsWaiting,
        rCpuProgram,
    };
}

// export function createMotherTracker(unitId: () => UnitId | null) {
//     const { units } = useGame();
//     let lastUpdated = -1;
//     let lastUnitId: UnitId | null = null;

//     const [rCurrentSpawn, setCurrentSpawn] = createSignal<MotherData['currentSpawn'] | null>(null);
//     const [rSpawnQueue, setSpawnQueue] = createSignal<MotherData['spawnQueue']>([]);
//     const [rSpawnProgress, setSpawnProgress] = createSignal(0);

//     onTickConditional(unitId, (unitId) => (tick) => {
//         const mother = units.mother.getData(unitId);
//         if (!mother) {
//             if (lastUnitId !== null) {
//                 lastUnitId = null;
//                 lastUpdated = -1;
//                 setCurrentSpawn(null);
//                 setSpawnQueue([]);
//                 setSpawnProgress(0);
//             }
//             return;
//         }

//         if (mother.lastUpdated > lastUpdated || unitId !== lastUnitId) {
//             lastUnitId = unitId;
//             lastUpdated = mother.lastUpdated;

//             setCurrentSpawn(mother.currentSpawn ? { ...mother.currentSpawn } : null);
//             setSpawnQueue(mother.spawnQueue.slice());
//         }

//         setSpawnProgress(
//             mother.currentSpawn?.started ? (tick - mother.currentSpawn.started) / mother.currentSpawn.timeToBuild : 0,
//         );
//     });

//     return { rCurrentSpawn, rSpawnQueue, rSpawnProgress };
// }

export function createAssemblerTracker(unitId: () => UnitId | null) {
    const { units } = useGame();

    const [rCurrentSpawn, setCurrentSpawn] = createSignal<AssemblerData['currentSpawn'] | null>(null);
    const [rSpawnQueue, setSpawnQueue] = createSignal<AssemblerData['spawnQueue']>([]);
    const [rSpawnProgress, setSpawnProgress] = createSignal(0);

    const applyUpdates = (ev: UnitEventData<unknown>) => {
        const data = units.assembler.getData(ev.unitId)!;

        setCurrentSpawn(data.currentSpawn ? { ...data.currentSpawn } : null);
        setSpawnQueue(data.spawnQueue.slice());

        if (!data.currentSpawn) {
            setSpawnProgress(0);
        }
    };

    createUnitEventListener({
        ev: units.assembler.queueUpdated,
        unitId,
        listener: applyUpdates,
    });

    createUnitEventListener({
        ev: units.assembler.spawned,
        unitId,
        listener: applyUpdates,
    });

    onTickConditional(
        () => {
            if (!rCurrentSpawn()) {
                return null;
            }

            return unitId();
        },
        (unitId) => (tick) => {
            const data = units.assembler.getData(unitId);
            if (!data) {
                return;
            }

            setSpawnProgress(
                data.currentSpawn?.started ? (tick - data.currentSpawn.started) / data.currentSpawn.timeToBuild : 0,
            );
        },
    );

    return { rCurrentSpawn, rSpawnQueue, rSpawnProgress };
}
