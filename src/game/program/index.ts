import { randomElement } from '@/lib/random';
import type { BotBehaviour, BotBlueprint } from '../types';

export const createDefaultProgramText = (name: string) =>
    `# Behaviour for all ${name} bots

command move(position to) {
    navigator.navigate(to)
}

command mine {
    drill.mine
}

command roam {
    state roaming
}

command idle {
    state idle
}

state roaming {
    navigator.move(random)
}
`;

const testBehaviour: BotBehaviour = {
    setup: () => ({ state: 'roaming', data: {} }),
    tick: (bot, env) => {
        switch (bot.behaviourState.state) {
            case 'roaming':
                return {
                    botState: {
                        location: randomElement(Math.random, env.world.nodes[bot.botState.location].connections),
                    },
                };

            case 'idle':
                return null;
        }

        return null;
    },
};

export function compileBotProgram(
    blueprint: BotBlueprint,
): { ok: true; result: BotBehaviour } | { ok: false; message: string } {
    const program = blueprint.program;
    if (!program) {
        return { ok: false, message: 'Nope' };
    }

    // test
    return {
        ok: true,
        result: testBehaviour,
    };
}
