import type { UnitBehaviour, UnitConfiguration } from '../types';
import { parser } from './bsml';
import { compile } from './compiler';
import { createRunner } from './runner';

export const createDefaultProgramText = () =>
    `# Unit's program is a state machine

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
    config: UnitConfiguration,
): { ok: true; result: UnitBehaviour } | { ok: false; message: string } {
    const program = config.program;
    if (!program) {
        return { ok: false, message: 'The program is empty' };
    }

    const compiled = compile(program, parser.parse(program));
    if (compiled.errors.length) {
        return { ok: false, message: `found ${compiled.errors.length} errors` };
    }

    return { ok: true, result: createRunner(compiled.program) };
}
