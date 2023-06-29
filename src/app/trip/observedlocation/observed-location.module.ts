import { NgModule } from '@angular/core';
import { ObservedLocationPage } from './observed-location.page';
import { SelectVesselsForDataModal } from './vessels/select-vessel-for-data.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { AppLandedTripModule } from '@app/trip/landedtrip/landed-trip.module';
import { AppAggregatedLandingModule } from '@app/trip/aggregated-landing/aggregated-landing.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppObservedLocationOfflineModule } from '@app/trip/observedlocation/offline/observed-location-offline.module';
import { AppObservedLocationsTableModule } from '@app/trip/observedlocation/table/observed-location-table.module';
import {AppObservedLocationFormModule} from '@app/trip/observedlocation/form/observed-location-form.module';


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
    AppObservedLocationsTableModule,
    AppObservedLocationOfflineModule,
    AppObservedLocationFormModule,
  ],
  declarations: [
    ObservedLocationPage,
    SelectVesselsForDataModal
  ],
  exports: [
    AppObservedLocationsTableModule,
  ]
})
export class AppObservedLocationModule {

  constructor() {
    console.debug('[observed-location] Creating module...');
  }
}
