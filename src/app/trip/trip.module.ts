import { NgModule } from '@angular/core';
import { TripTable } from './trip/trips.table';
import { TripPage } from './trip/trip.page';
import { TripForm } from './trip/trip.form';
import { SaleForm } from './sale/sale.form';
import { OperationForm } from './operation/operation.form';
import { OperationPage } from './operation/operation.page';
import { PhysicalGearForm } from './physicalgear/physical-gear.form';
import { PhysicalGearTable } from './physicalgear/physical-gears.table';
import { OperationsTable } from './operation/operations.table';
import { AppActionCellDef, SamplesTable } from './sample/samples.table';
import { SubSamplesTable } from './sample/sub-samples.table';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { PhysicalGearModal } from './physicalgear/physical-gear.modal';
import { AppReferentialModule } from '../referential/referential.module';
import { SampleForm } from './sample/sample.form';
import { SampleModal } from './sample/sample.modal';
import { SelectPhysicalGearModal } from './physicalgear/select-physical-gear.modal';
import { AppDataModule } from '../data/data.module';
import { OperationsMap } from './operation/map/operations.map';
import { SocialModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { TripTrashModal } from './trip/trash/trip-trash.modal';
import { AppCoreModule } from '@app/core/core.module';
import { SelectOperationModal } from '@app/trip/operation/select-operation.modal';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';
import { TripOfflineModal } from '@app/trip/trip/offline/trip-offline.modal';
import { A11yModule } from '@angular/cdk/a11y';
import { VesselModule } from '@app/vessel/vessel.module';
import { SubSampleForm } from '@app/trip/sample/sub-sample.form';
import { SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { OperationIconComponent } from '@app/trip/operation/icon/operation-icon.component';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { AppBatchModule } from '@app/trip/batch/batch.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';

@NgModule({
  imports: [
    CommonModule,
    LeafletModule,
    TranslateModule.forChild(),

    SocialModule,
    A11yModule,

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    VesselModule,

    // Functional modules
    AppMeasurementModule,
    AppBatchModule

  ],
  declarations: [
    TripTable,
    TripForm,
    TripPage,
    TripTrashModal,
    TripOfflineModal,
    PhysicalGearTable,
    PhysicalGearForm,
    PhysicalGearModal,
    SelectPhysicalGearModal,
    SaleForm,
    OperationsTable,
    OperationForm,
    OperationPage,
    OperationsMap,
    SelectOperationModal,
    SelectOperationByTripTable,
    SamplesTable,
    SubSamplesTable,

    SamplesTable,
    SampleForm,
    SampleModal,
    SubSamplesTable,
    SubSampleForm,
    SubSampleModal,
    IndividualMonitoringTable,
    IndividualReleasesTable,
    OperationIconComponent,
    AppActionCellDef,
    SampleTreeComponent
  ],
  exports: [
    // Modules
    TranslateModule,
    SocialModule,

    // App modules
    AppCoreModule,
    AppDataModule,
    AppReferentialModule,
    AppBatchModule,

    // Pipes

    // Components
    TripTable,
    TripPage,
    TripForm,
    PhysicalGearModal,
    SaleForm,
    PhysicalGearForm,
    PhysicalGearTable,
    OperationForm,
    OperationPage,
    OperationsTable,
    SampleForm,
    SamplesTable,
    SubSamplesTable,
    SampleTreeComponent
  ]
})
export class TripModule {

  constructor() {
    console.debug('[trip] Creating module...');
  }
}
