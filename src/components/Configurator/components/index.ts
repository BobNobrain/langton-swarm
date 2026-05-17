import { AssemblerUnitComponent } from './assembler';
import { BatteryUnitComponent } from './battery';
import { DrillUnitComponent } from './drill';
import { EngineUnitComponent } from './engine';
import { NavigatorUnitComponent } from './navigator';
import { ScannerUnitComponent } from './scanner';
import { SolarUnitComponent } from './solar';
import { StorageUnitComponent } from './storage';

export type { UnitComponent, UnitComponentRendererProps } from './types';
export { UnitComponentWrapper } from './wrapper';

export const UnitComponents = [
    BatteryUnitComponent,
    SolarUnitComponent,
    EngineUnitComponent,
    NavigatorUnitComponent,
    StorageUnitComponent,
    DrillUnitComponent,
    ScannerUnitComponent,
    AssemblerUnitComponent,
];
