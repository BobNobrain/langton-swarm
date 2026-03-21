import type { BlueprintId } from '../deck';

export type BsmlValue =
    | { type: 'number'; value: number }
    | { type: 'flag'; value: boolean }
    | { type: 'position'; value: number }
    | { type: 'string'; value: string }
    | { type: 'blueprint'; value: BlueprintId }
    | { type: 'state'; value: string };

export type BsmlValueType = BsmlValue['type'];
