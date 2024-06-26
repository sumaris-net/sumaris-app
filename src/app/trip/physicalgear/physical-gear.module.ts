import { NgModule } from '@angular/core';
import { PhysicalGearForm } from './physical-gear.form';
import { PhysicalGearTable } from './physical-gears.table';
import { PhysicalGearModal } from './physical-gear.modal';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SelectPhysicalGearModal } from './select-physical-gear.modal';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,

    // Functional modules
    AppVesselModule,
    AppMeasurementModule,
  ],
  declarations: [PhysicalGearTable, PhysicalGearForm, PhysicalGearModal, SelectPhysicalGearModal],
  exports: [
    // Modules
    TranslateModule,

    // Pipes

    // Components
    PhysicalGearTable,
    SelectPhysicalGearModal,
  ],
})
export class AppPhysicalGearModule {
  constructor() {
    console.debug('[physical-gear] Creating module...');
  }
}
