export const UPGRADE_DELAY_TICKS = 50;
export const CPU_EVENT_MESSAGE_NAME = 'event';
export const CPU_RETURN_MESSAGE_NAME = 'return';

export enum CpuEvent {
    Spawned = 'spawned',
    Upgraded = 'upgraded',

    BatteryLow = 'battery.low',

    AssemblerQueueUpdated = 'assembler.queue_updated',
}

export const ALL_CPU_EVENTS: string[] = [
    CpuEvent.Spawned,
    CpuEvent.Upgraded,
    CpuEvent.BatteryLow,
    CpuEvent.AssemblerQueueUpdated,
];
