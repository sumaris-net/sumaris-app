import { NgModule } from '@angular/core';
import { AggregatedLandingForm } from './aggregated-landing.form';
import { AggregatedLandingsTable } from './aggregated-landings.table';
import { VesselActivityForm } from './vessel-activity.form';
import { AggregatedLandingModal } from './aggregated-landing.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // Functional modules
    AppReferentialModule
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
