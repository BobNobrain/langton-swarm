export function absurd(val: never): never {
    console.error('[ERROR] exhaustiveness check failed', val);
    throw new Error('this was supposed to be exhaustive');
}
