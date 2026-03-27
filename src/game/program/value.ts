import type { BlueprintId } from '../deck';
import type { NodeId } from '../types';

export type BsmlValue =
    | { type: 'number'; value: number }
    | { type: 'flag'; value: boolean }
    | { type: 'position'; value: NodeId }
    | { type: 'string'; value: string }
    | { type: 'magic'; name: string }
    | { type: 'blueprint'; value: BlueprintId }
    | { type: 'state'; value: string };

export type BsmlValueType = BsmlValue['type'];
