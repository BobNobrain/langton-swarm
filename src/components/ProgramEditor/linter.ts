import { compile } from '@/game/program/compiler';
import { lintProgram } from '@/game/program/linter';
import { syntaxTree } from '@codemirror/language';
import { linter, Diagnostic } from '@codemirror/lint';

export const bsmlLinter = linter((view) => {
    const errors: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const compiled = compile(view.state.doc.toString(), tree);

    for (const syntaxError of compiled.errors) {
        errors.push({
            from: syntaxError.pos.from,
            to: syntaxError.pos.to,
            message: syntaxError.message,
            severity: 'error',
        });
    }

    errors.push(...lintProgram(compiled.program));

    return errors;
});
