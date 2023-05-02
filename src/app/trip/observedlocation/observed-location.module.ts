import { NgModule } from '@angular/core';
import { ObservedLocationForm } from './observed-location.form';
import { ObservedLocationPage } from './observed-location.page';
import { ObservedLocationsPage } from './observed-locations.page';
import { SelectVesselsForDataModal } from './vessels/select-vessel-for-data.modal';
import { TranslateModule } from '@ngx-translate/core';
import { ObservedLocationOfflineModal } from './offline/observed-location-offline.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { AppLandedTripModule } from '@app/trip/landedtrip/landed-trip.module';
import { AppAggregatedLandingModule } from '@app/trip/aggregated-landing/aggregated-landing.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppObservedLocationOfflineModule } from '@app/trip/observedlocation/offline/observed-location-offline.module';


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

    // Sub modules
    AppObservedLocationOfflineModule
  ],
  declarations: [
    ObservedLocationForm,
    ObservedLocationPage,
    ObservedLocationsPage,
    SelectVesselsForDataModal
  ],
  exports: [
    // Components
    ObservedLocationsPage
  ]
})
export class AppObservedLocationModule {

  constructor() {
    console.debug('[observed-location] Creating module...');
  }
}
