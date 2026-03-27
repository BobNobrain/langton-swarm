import { syntaxTree } from '@codemirror/language';
import { linter, Diagnostic } from '@codemirror/lint';
import { lintProgram } from '@/game/program/linter';
import { parseProgram } from '@/game/program/parser';
import type { UnitConfiguration } from '@/game';

export const bsmlLinter = (config: UnitConfiguration | null) =>
    linter((view) => {
        const errors: Diagnostic[] = [];
        const tree = syntaxTree(view.state);
        const compiled = parseProgram(view.state.doc.toString(), tree);

        for (const syntaxError of compiled.errors) {
            errors.push({
                from: syntaxError.pos.from,
                to: syntaxError.pos.to,
                message: syntaxError.message,
                severity: 'error',
            });
        }

        errors.push(...lintProgram(compiled.program, config));

        return errors;
    });
