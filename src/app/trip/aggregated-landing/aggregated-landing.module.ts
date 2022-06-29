import { NgModule } from '@angular/core';
import { AggregatedLandingForm } from './aggregated-landing.form';
import { AggregatedLandingsTable } from './aggregated-landings.table';
import { VesselActivityForm } from './vessel-activity.form';
import { AggregatedLandingModal } from './aggregated-landing.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';


@NgModule({
  imports: [
    AppCoreModule,
    //AppDataModule,
    TranslateModule.forChild(),

    //AppTripModule,
    //VesselModule,
    //AppReferentialModule,
    //AppMeasurementModule,

    // Functional modules
    //AppLandingModule,
    //AppLandedTripModule,
  ],
  declarations: [
    AggregatedLandingsTable,
    AggregatedLandingModal,
    AggregatedLandingForm,
    VesselActivityForm
  ],
  exports: [

    // Components
    AggregatedLandingsTable
  ]
})
export class AppAggregatedLandingModule {

  constructor() {
    console.debug('[aggregated-landing] Creating module...');
  }
}
