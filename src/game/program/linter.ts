import { type Diagnostic } from '@codemirror/lint';
import type { BsmlProgram } from './program';
import { typecheck } from './typecheck';

type LintState = {
    result: Diagnostic[];
};

export function lintProgram(p: BsmlProgram): Diagnostic[] {
    const state: LintState = { result: [] };
    // TODO: typecheck, etc.

    const typeErrors = typecheck(p);
    for (const err of typeErrors) {
        state.result.push({
            from: err.pos.from,
            to: err.pos.to,
            message: err.message,
            severity: err.nonCritical ? 'warning' : 'error',
            source: 'typecheck',
        });
    }

    let nDefaultStatesFound = 0;
    for (const stateDecl of p.stateDeclarations) {
        if (stateDecl.isDefault) {
            nDefaultStatesFound++;
        }

        if (nDefaultStatesFound > 1) {
            state.result.push({
                from: stateDecl.pos.from,
                to: stateDecl.pos.to,
                message: `There cannot be more than 1 default states`,
                severity: 'error',
                source: 'state-machine',
            });
        }
    }

    return state.result;
}
