import { createContext, createSignal, useContext } from 'solid-js';

export type AppScene = 'menu' | 'game';

export type AppContext = {
    rScene: () => AppScene;
    setScene: (scene: AppScene) => void;
};

const AppContext = createContext<AppContext>({
    rScene: () => 'menu' as const,
    setScene() {},
});

export const useAppState = () => useContext(AppContext);
export const AppContextProvider = AppContext.Provider;

export function createAppState(opts: { defaultScene: AppScene }): AppContext {
    const [rScene, setScene] = createSignal<AppScene>(opts.defaultScene);
    return { rScene, setScene };
}
