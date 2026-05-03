import type { BlueprintId } from '../deck';
import type { InventoryDelta } from '../inventory';
import type { NodeId } from '../types';

export type BsmlValue =
    | { type: 'null' }
    | { type: 'number'; value: number }
    | { type: 'flag'; value: boolean }
    | { type: 'position'; value: NodeId }
    | { type: 'string'; value: string }
    | { type: 'inventory'; value: InventoryDelta }
    | { type: 'blueprint'; value: BlueprintId }
    | { type: 'state'; value: string };

export type BsmlValueType = BsmlValue['type'];
