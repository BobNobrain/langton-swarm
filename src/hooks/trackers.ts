import { createEffect, createMemo, createSignal } from 'solid-js';
import type { NodeId, UnitId, InventoryData, BsmlValue } from '@/game';
import type { CompiledProgram } from '@/game/program/compile';
import { renderStateName } from '@/game/program/utils';
import type { AssemblerData, CPUData } from '@/game/systems';
import { useGame } from '@/gameContext';
import { onTickConditional } from '@/hooks/onTick';
import { createUnitEventListener } from './events';
import type { UnitEventData } from '@/game/systems/events';
import type { ConstructionSiteData } from '@/game/systems/sites';
import { InventoryDelta } from '@/game/inventory';

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
        const pos = units.positions.getEffectivePosition(uid);
        rSetLocation(pos === -1 ? null : pos);

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
    shouldDespawnWhenEmpty: false,
};

export function createInventoryTracker(unitId: () => UnitId | null) {
    const { units } = useGame();
    const [rInventory, rSetInventory] = createSignal(NO_INVENTORY);

    createEffect(() => {
        const uid = unitId();
        if (!uid) {
            rSetInventory(NO_INVENTORY);
            return;
        }

        const inventory = units.inventory.getInfo(uid);
        rSetInventory(inventory ? { ...inventory } : NO_INVENTORY);
    });

    createUnitEventListener({
        ev: units.inventory.updated,
        unitId,
        listener(ev) {
            rSetInventory({ ...ev.payload });
        },
        cleanup() {
            rSetInventory(NO_INVENTORY);
        },
    });

    return rInventory;
}

export function createCPUStateTracker(unitId: () => UnitId | null) {
    const { units } = useGame();

    const [rCpuStack, setCpuStack] = createSignal<BsmlValue[]>([]);
    const [rCpuPtr, setCpuPtr] = createSignal(0);
    const [rStateName, setStateName] = createSignal<string | null>(null);
    const [rCpuIsWaiting, setCpuIsWaiting] = createSignal('--');

    const [rCpuProgram, setCpuProgram] = createSignal<CompiledProgram | null>(null);

    const update = (cpu: CPUData | null) => {
        if (!cpu) {
            setCpuStack([]);
            setCpuPtr(0);
            setStateName(null);
            setCpuProgram(null);
            setCpuIsWaiting('--');
            return;
        }

        setCpuProgram(cpu.program);
        setCpuStack(cpu.stack.slice());
        setCpuPtr(cpu.ptr >= cpu.program.stateInstructions[cpu.state].length ? 0 : cpu.ptr);
        setStateName(cpu.state);
        setCpuIsWaiting(cpu.waitingForReturn?.system ?? '--');
    };

    createEffect(() => {
        const uid = unitId();
        if (!uid) {
            update(null);
            return;
        }

        update(units.cpu.getData(uid));
    });

    createUnitEventListener({
        ev: units.cpu.updated,
        unitId,
        listener(ev) {
            update(ev.payload);
        },
    });

    return {
        rCpuStack,
        rCpuPtr,
        rStateName,
        rCpuIsWaiting,
        rCpuProgram,
    };
}

export function createAssemblerTracker(unitId: () => UnitId | null) {
    const { units } = useGame();

    const [rCurrentSpawn, setCurrentSpawn] = createSignal<AssemblerData['currentSpawn'] | null>(null);
    const [rSpawnQueue, setSpawnQueue] = createSignal<AssemblerData['spawnQueue']>([]);
    const [rSpawnProgress, setSpawnProgress] = createSignal(0);
    const [rCharacteristics, setCharacteristics] = createSignal({ speed: 0 });

    const updateCurrentSpawn = (spawnData: AssemblerData['currentSpawn'] | null) => {
        setCurrentSpawn(spawnData);
        setSpawnProgress(
            spawnData && spawnData.resourcesConsumed ? spawnData.pointsSpent / spawnData.pointsToBuild : 0,
        );
    };

    createEffect(() => {
        const uid = unitId();
        if (!uid) {
            updateCurrentSpawn(null);
            setSpawnQueue([]);
            setCharacteristics({ speed: 0 });
            return;
        }

        const assembler = units.assembler.getData(uid);
        if (!assembler) {
            return;
        }

        setCharacteristics({ speed: assembler.speed });
        setSpawnQueue(assembler.spawnQueue.slice());
        updateCurrentSpawn(assembler.currentSpawn);
    });

    createUnitEventListener({
        ev: units.assembler.queueUpdated,
        unitId,
        listener(ev) {
            setSpawnQueue(ev.payload.slice());
        },
    });

    createUnitEventListener({
        ev: units.assembler.currentSpawnUpdated,
        unitId,
        listener(ev) {
            updateCurrentSpawn(ev.payload);
        },
    });

    return { rCurrentSpawn, rSpawnQueue, rSpawnProgress, rCharacteristics };
}

export function createUnitsAtLocationTracker(location: () => NodeId | null) {
    const { units } = useGame();
    const [rUnitIds, setUnitIds] = createSignal<UnitId[]>([]);

    onTickConditional(
        location,
        (location) => () => {
            const newIds = units.positions.findAtPosition(location, { strict: true });
            setUnitIds((oldIds) => {
                if (oldIds.length !== newIds.length) {
                    return newIds;
                }

                for (let i = 0; i < oldIds.length; i++) {
                    if (oldIds[i] !== newIds[i]) {
                        return newIds;
                    }
                }

                return oldIds;
            });
        },
        () => setUnitIds([]),
    );

    return rUnitIds;
}

export function createConstructionSiteUnderAssemblerTracker(assemblerUnitId: () => UnitId | null) {
    const { units } = useGame();
    const [rSiteProgress, setConstructionSiteProgress] = createSignal(0);
    const [rSiteMatsRequired, setSiteMatsRequired] = createSignal<InventoryDelta | null>(null);

    onTickConditional(assemblerUnitId, (unitId) => () => {
        const location = units.positions.getEffectivePosition(unitId);
        const siteId = units.sites.findByLocation(location);

        if (!siteId) {
            setConstructionSiteProgress(0);
            return;
        }

        const progress = units.sites.getProgress(siteId);
        const mats = units.sites.getMatsRequired(siteId);
        setConstructionSiteProgress(progress);
        setSiteMatsRequired(mats);
    });

    return { rSiteProgress, rSiteMatsRequired };
}

export function createIsStaticTracker(unitId: () => UnitId | null) {
    const { units } = useGame();
    const [rIsStatic, setIsStatic] = createSignal(false);

    createEffect(() => {
        const uid = unitId();
        if (!uid) {
            setIsStatic(false);
            return;
        }

        setIsStatic(units.stationaries.isStationary(uid));
    });

    return { rIsStatic };
}
