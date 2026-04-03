export type BsmlProgram = {
    stateDeclarations: BsmlStateDeclaration[];
    commandDeclarations: BsmlCommandDeclaration[];
    eventListeners: BsmlEventListener[];
};

export type BsmlStateDeclaration = {
    pos: CodePosition;
    name: string;
    isDefault: boolean;
    args: BsmlArgument[];
    body: BsmlInstruction[];
};

export type BsmlCommandDeclaration = {
    pos: CodePosition;
    name: string;
    args: BsmlArgument[];
    body: BsmlInstruction[];
};

export type BsmlEventListener = {
    pos: CodePosition;
    event: string;
    body: BsmlInstruction[];
};

export type BsmlArgument = {
    pos: CodePosition;
    type: string;
    name: string;
};

export type BsmlInstruction = { pos: CodePosition } & (
    | BsmlSetStateInstruction
    | BsmlAssignmentInstruction
    | BsmlFunctionCall
    | BsmlConditonalInstruction
);
export type BsmlSetStateInstruction = {
    type: 'set_state';
    state: BsmlExpression;
    args: BsmlExpression[];
};
export type BsmlAssignmentInstruction = {
    type: 'assign';
    variable: string;
    value: BsmlExpression;
};
export type BsmlConditonalInstruction = {
    type: 'branch';
    condition: BsmlExpression;
    body: BsmlInstruction[];
};

export type BsmlExpression = { pos: CodePosition } & (
    | BsmlNumberLiteral
    | BsmlStringLiteral
    | BsmlBoolLiteral
    | BsmlIdentifierExpression
    | BsmlStateNameIdentifier
    | BsmlFunctionCall
    | BsmlBinaryExpression
    | BsmlUnaryExpression
);
export type BsmlNumberLiteral = {
    type: 'number';
    value: number;
};
export type BsmlStringLiteral = {
    type: 'string';
    value: string;
};
export type BsmlBoolLiteral = {
    type: 'bool';
    value: boolean;
};
export type BsmlIdentifierExpression = {
    type: 'ident';
    identifier: string;
};
export type BsmlStateNameIdentifier = {
    type: 'state';
    stateName: string;
};
export type BsmlStateNameLiteral = {
    type: 'state';
    stateName: string;
};
export type BsmlFunctionCall = {
    type: 'call';
    name: string;
    args: BsmlExpression[];
};
export type BsmlBinaryExpression = {
    type: 'binary';
    operator: string;
    left: BsmlExpression;
    right: BsmlExpression;
};
export type BsmlUnaryExpression = {
    type: 'unary';
    operator: string;
    operand: BsmlExpression;
};

export type CodePosition = {
    readonly from: number;
    readonly to: number;
};
