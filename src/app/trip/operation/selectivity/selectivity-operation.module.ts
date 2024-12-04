import { NgModule } from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppBatchModule } from '@app/trip/batch/batch.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppPhysicalGearModule } from '@app/trip/physicalgear/physical-gear.module';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';

@NgModule({
  imports: [
    CommonModule,
    LeafletModule,
    TranslateModule.forChild(),

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    AppVesselModule,

    // Functional modules
    AppMeasurementModule,
    AppBatchModule,
    AppSampleModule,
    AppPhysicalGearModule,
    AppOperationModule,
    AppExtractionButtonModule,
  ],
  declarations: [SelectivityOperationPage],
  exports: [
    // Components
    SelectivityOperationPage,
  ],
})
export class AppSelectivityOperationModule {
  constructor() {
    console.debug('[selectivity-operation] Creating module...');
  }
}
