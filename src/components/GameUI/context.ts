import { createContext, createEffect, onCleanup, useContext } from 'solid-js';

type GameUIContext = {
    setIsExpanded: (v: boolean) => void;
};

const context = createContext<GameUIContext>({} as GameUIContext);
export const GameUIContextProvider = context.Provider;

export function useExpandedPanel(signal: () => boolean) {
    const ctx = useContext(context);
    createEffect(() => {
        ctx.setIsExpanded(signal());
    });

    onCleanup(() => {
        ctx.setIsExpanded(false);
    });
}
