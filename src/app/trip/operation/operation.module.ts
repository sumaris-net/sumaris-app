import { NgModule } from '@angular/core';
import { OperationForm } from './operation.form';
import { OperationPage } from './operation.page';
import { OperationsTable } from './operations.table';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { OperationsMap } from './map/operations.map';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { SelectOperationModal } from '@app/trip/operation/select-operation.modal';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppBatchModule } from '@app/trip/batch/batch.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppPhysicalGearModule } from '@app/trip/physicalgear/physical-gear.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { OperationIconComponent } from '@app/trip/operation/icon/operation-icon.component';
import { OperationsMapModal } from '@app/trip/operation/map/operations-map.modal';

@NgModule({
  imports: [
    CommonModule,
    LeafletModule,
    TranslateModule.forChild(),

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    VesselModule,

    // Functional modules
    AppMeasurementModule,
    AppBatchModule,
    AppSampleModule,
    AppPhysicalGearModule
  ],
  declarations: [
    OperationsTable,
    OperationsMap,
    OperationsMapModal,
    OperationForm,
    OperationPage,
    SelectOperationModal,
    SelectOperationByTripTable,
    OperationIconComponent
  ],
  exports: [
    LeafletModule,
    // Components
    OperationsTable,
    OperationsMap,
    OperationsMapModal,
    OperationForm,
    OperationPage,
    OperationIconComponent
  ]
})
export class AppOperationModule {

  constructor() {
    console.debug('[operation] Creating module...');
  }
}
