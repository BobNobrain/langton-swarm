export type BsmlValue =
    | { type: 'number'; value: number }
    | { type: 'flag'; value: boolean }
    | { type: 'position'; value: number }
    | { type: 'string'; value: string }
    | { type: 'state'; value: string };

export type BsmlValueType = BsmlValue['type'];
