import type { BotConfiguration } from './types';

export function createDefaultBotConfig(): BotConfiguration {
    return {
        battery: { capacity: 100 },
        navigator: true,
        receiver: true,
        storage: { size: 100 },
    };
}

export function getProcessorTickRate(config: BotConfiguration): number {
    return 10; // every 10 ticks, so 2 times per second
}
