import { createContext, useContext } from 'solid-js';
import type { Game } from '@/game';

const outOfContext = new Proxy({} as Game, {
    get: (_, prop) => {
        throw new Error('out of context (GameContext)');
    },
});

const GameContext = createContext<Game>(outOfContext);
export const useGame = () => useContext(GameContext);
export const GameProvider = GameContext.Provider;
