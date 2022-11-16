import { NgModule } from '@angular/core';
import { SamplesTable } from './samples.table';
import { SubSamplesTable } from './sub-samples.table';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SampleForm } from './sample.form';
import { SampleModal } from './sample.modal';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { SubSampleForm } from '@app/trip/sample/sub-sample.form';
import { SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { SamplesModal } from '@app/trip/sample/samples.modal';
import {ImageGalleryModule} from "@sumaris-net/ngx-components";
import {AppDataImageModule} from '@app/data/image/image.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    AppDataImageModule,

    // Functional modules
    AppMeasurementModule,
    ImageGalleryModule
  ],
  declarations: [
    SamplesTable,
    SampleForm,
    SampleModal,
    SamplesModal,
    SubSamplesTable,
    SubSampleForm,
    SubSampleModal,
    IndividualMonitoringTable,
    IndividualReleasesTable,
    SampleTreeComponent
  ],
  exports: [
    // Components
    SamplesTable,
    SamplesModal,
    SampleForm,
    SubSamplesTable,
    SampleTreeComponent
  ]
})
export class AppSampleModule {

  constructor() {
    console.debug('[sample] Creating module...');
  }
}
