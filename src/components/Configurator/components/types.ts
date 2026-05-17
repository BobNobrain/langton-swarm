import type { UnitConfiguration } from '@/game';
import type { Component } from 'solid-js';

export type UnitComponentRendererProps = {
    config: UnitConfiguration;
    onUpdate: (patch: Partial<UnitConfiguration>) => void;
    readonly: boolean;
};

export type UnitComponent = {
    cls: string | undefined;
    icon: string;
    name: string;
    description: (config: UnitConfiguration) => string;
    initial: Partial<UnitConfiguration>;
    remove: Partial<UnitConfiguration>;
    isolate: (config: UnitConfiguration) => Partial<UnitConfiguration>;
    isPresent: (config: UnitConfiguration) => boolean;
    inputRenderer: Component<UnitComponentRendererProps>;
    mode?: 'default' | 'required' | 'persistent';
    getTier?: (config: UnitConfiguration) => 0 | 1 | 2;
    warningsRenderer?: Component<UnitComponentRendererProps>;
};
