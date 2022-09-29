import { NgModule } from '@angular/core';
import { LandingsTable } from './landings.table';
import { LandingPage } from './landing.page';
import { LandingForm } from './landing.form';
import { SelectLandingsModal } from './select-landings.modal';
import { AuctionControlPage } from './auctioncontrol/auction-control.page';
import { AppDataModule } from '../../data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { SamplingLandingPage } from './sampling/sampling-landing.page';
import { VesselModule } from '../../vessel/vessel.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { LandingReport } from './landing.report';


@NgModule({
  imports: [
    AppCoreModule,
    AppDataModule,
    VesselModule,
    AppReferentialModule,
    AppSharedReportModule,
    TranslateModule.forChild(),

    // Functional modules
    AppMeasurementModule,
    AppSampleModule
  ],
  declarations: [
    LandingsTable,
    LandingForm,
    LandingPage,
    SelectLandingsModal,
    LandingReport,
  ],
  exports: [
    // Components
    LandingsTable,
    LandingForm,
    LandingPage,
    SelectLandingsModal,
    LandingReport,
  ]
})
export class AppLandingModule {

  constructor() {
    console.debug('[landing] Creating module...');
  }
}
