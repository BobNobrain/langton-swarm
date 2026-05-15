import { StateEffect, StateField, type Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

export const highlightMark = Decoration.mark({
    attributes: { style: 'outline: 2px solid var(--c-primary); border-radius: 4px;' },
});

export const setHighlight = StateEffect.define<Range<Decoration> | null>();

export const highlightField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(value, transaction) {
        value = value.map(transaction.changes);
        for (const effect of transaction.effects) {
            if (effect.is(setHighlight)) {
                value = value.update({
                    add: effect.value ? [effect.value] : undefined,
                    filter: (from, to) => (effect.value ? effect.value.from === from && effect.value.to === to : false),
                });
            }
        }
        return value;
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});
