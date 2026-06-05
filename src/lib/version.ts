export type GameVersion = {
    name?: string;
    major: number;
    minor: number;
    patch: number;
    date: Date;
};

export function renderGameVersion(v: GameVersion) {
    const title = v.name ? `(${v.name})` : '';
    const date = `${v.date.getFullYear()}-${v.date.getMonth() + 1}-${v.date.getDate()}`;
    const version = [v.major, v.minor, v.patch].join('.');
    return [version, title, date].filter(Boolean).join(' ');
}

export const GAME_VERSION: GameVersion = {
    major: 0,
    minor: 2,
    patch: 0,
    date: new Date('2026-05-31 UTC+0300'),
};

export function isCurrent(v: GameVersion): boolean {
    return v.major === GAME_VERSION.major && v.minor === GAME_VERSION.minor && v.patch === GAME_VERSION.patch;
}
