export type Ticker = (tick: number) => void;

export type Engine = {
    on: (t: Ticker) => number;
    off: (id: number) => void;
    start: () => void;
    stop: () => void;
    clear: () => void;
};

export function createEngine(tickTime: number): Engine {
    const tickers = new Map<number, Ticker>();
    let idSeq = 0;
    let intervalId: number;

    let tick = 0;

    return {
        on: (t) => {
            const id = idSeq;
            ++idSeq;
            tickers.set(id, t);
            return id;
        },
        off: (id) => {
            tickers.delete(id);
        },
        clear: () => {
            tickers.clear();
        },

        start: () => {
            intervalId = window.setInterval(() => {
                for (const t of tickers.values()) {
                    t(tick);
                }
                ++tick;
            }, tickTime);
        },
        stop: () => {
            clearInterval(intervalId);
        },
    };
}
