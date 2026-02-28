import type { BotBehaviour, BotBlueprint } from '../types';
import { parser } from './bsml';
import { compile } from './compiler';
import { createRunner } from './runner';

export const createDefaultProgramText = (name: string) =>
    `# Behaviour for all ${name} bots

command move(position to) {
    #navigator.navigate(to)
}

command mine {
    drill.mine
}

command roam {
    state :roaming
}

command idle {
    state :idle
}

state roaming default {
    navigator.move(random)
}
`;

export function compileBotProgram(
    blueprint: BotBlueprint,
): { ok: true; result: BotBehaviour } | { ok: false; message: string } {
    const program = blueprint.program;
    if (!program) {
        return { ok: false, message: 'The program is empty' };
    }

    const compiled = compile(program, parser.parse(program));
    if (compiled.errors.length) {
        return { ok: false, message: `found ${compiled.errors.length} errors` };
    }

    return { ok: true, result: createRunner(compiled.program) };
}
