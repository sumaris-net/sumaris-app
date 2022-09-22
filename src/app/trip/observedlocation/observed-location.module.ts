import { NgModule } from '@angular/core';
import { ObservedLocationForm } from './observed-location.form';
import { ObservedLocationPage } from './observed-location.page';
import { ObservedLocationsPage } from './observed-locations.page';
import { SelectVesselsModal } from './vessels/select-vessel.modal';
import { TranslateModule } from '@ngx-translate/core';
import { ObservedLocationOfflineModal } from './offline/observed-location-offline.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { AppLandedTripModule } from '@app/trip/landedtrip/landed-trip.module';
import { AppAggregatedLandingModule } from '@app/trip/aggregated-landing/aggregated-landing.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { VesselModule } from '@app/vessel/vessel.module';
import { ObservedLocationReport } from './observed-location.report';
import { AppSharedReportModule } from '@app/shared/report/report.module';


@NgModule({
  imports: [
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    TranslateModule.forChild(),

    //AppTripModule,
    //AppReferentialModule,

    // Functional modules
    VesselModule,
    AppMeasurementModule,
    AppLandingModule,
    AppLandedTripModule,
    AppAggregatedLandingModule,
    AppSharedReportModule
  ],
  declarations: [
    ObservedLocationForm,
    ObservedLocationPage,
    ObservedLocationsPage,
    ObservedLocationOfflineModal,
    SelectVesselsModal,
    ObservedLocationReport
  ],
  exports: [
    // Components
    ObservedLocationsPage,
    ObservedLocationOfflineModal
  ]
})
export class AppObservedLocationModule {

  constructor() {
    console.debug('[observed-location] Creating module...');
  }
}
