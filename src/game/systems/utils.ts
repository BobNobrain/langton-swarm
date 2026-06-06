export function bfsSleepTime(visited: { readonly size: number }): number {
    return Math.floor(visited.size / 20);
}
