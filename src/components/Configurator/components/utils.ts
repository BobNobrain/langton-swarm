import type { SelectOption } from '@/components/Select/Select';

export function findValue<T>(opts: SelectOption<T>[], value: T | undefined): SelectOption<T> {
    return (
        opts.find((opt) => {
            if (opt.value === null || value === null) {
                return opt.value === value;
            }

            return opt.value === value;
        }) ?? opts[0]
    );
}
