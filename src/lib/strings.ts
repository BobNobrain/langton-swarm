export const NBSP = '\u0020';

export type FormatScalarOptions = {
    /** How many digits after decimal separator */
    digits?: number;
    /**
     * How many digits after decimal separator for a shortened version (like 2.5K)
     * @default 1
     */
    shortDigits?: number;
    /** Optional unit of measurement */
    unit?: string;
    /** If disable shortening 5000 -> 5K, etc. */
    noShortenings?: boolean;
    /** If positive numbers should be rendered with an explicit '+' sign in front */
    explicitPlusSign?: boolean;
};

export function formatScalar(
    scalar: number,
    { digits = 3, shortDigits = 1, unit, noShortenings, explicitPlusSign }: FormatScalarOptions = {},
): string {
    let suffix = '';
    let usedShortenings = false;
    if (!noShortenings) {
        const abs = Math.abs(scalar);
        usedShortenings = true;

        if (abs > 1e9) {
            suffix = 'B';
            scalar /= 1e9;
        } else if (abs > 1e6) {
            suffix = 'M';
            scalar /= 1e6;
        } else if (abs > 1e3) {
            suffix = 'K';
            scalar /= 1e3;
        } else {
            usedShortenings = false;
        }
    }

    if (unit) {
        suffix += NBSP + unit;
    }

    const prefix = explicitPlusSign && scalar > 0 ? '+' : '';

    const num = scalar.toFixed(usedShortenings ? shortDigits : digits);
    return prefix + num + suffix;
}

export type FormatIntegerOptions = {
    /** How many digits after decimal separator when integer is shortened */
    digits?: number;
    /** If positive numbers should be rendered with an explicit '+' sign in front */
    explicitPlusSign?: boolean;
};

export function formatInteger(integer: number, { digits = 1, explicitPlusSign }: FormatIntegerOptions = {}): string {
    let suffix = '';
    const abs = Math.abs(integer);
    if (abs > 1e9) {
        suffix = 'B';
        integer /= 1e9;
    } else if (abs > 1e6) {
        suffix = 'M';
        integer /= 1e6;
    } else if (abs > 1e3) {
        suffix = 'K';
        integer /= 1e3;
    }

    let prefix = '';
    if (explicitPlusSign && integer > 0) {
        prefix = '+';
    }

    if (!suffix) {
        return prefix + integer.toFixed(0);
    }

    return prefix + integer.toFixed(digits) + suffix;
}

type FormatPercentageOptions = {
    unit?: '%' | '0-1';
    digits?: number;
};

export function formatPercentage(
    unitValue: number,
    { unit = '%', digits = unit === '%' ? 0 : 2 }: FormatPercentageOptions = {},
): string {
    if (unit === '%') {
        return formatScalar(unitValue * 100, { digits, unit: '%', noShortenings: true });
    }

    return formatScalar(unitValue, { digits, noShortenings: true });
}
