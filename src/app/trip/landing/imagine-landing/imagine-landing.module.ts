import { NgModule } from '@angular/core';
import { ImagineLandingsTable } from './imagine-landings.table';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppObservedLocationOfflineModule } from '@app/trip/observedlocation/offline/observed-location-offline.module';
import { AppSelectObservedLocationsModalModule } from '@app/trip/observedlocation/select-modal/select-observed-locations.module';
import { VesselModule } from '@app/vessel/vessel.module';

@NgModule({
  imports: [
    AppCoreModule,
    AppDataModule,
    VesselModule,
    AppReferentialModule,
    TranslateModule.forChild(),

    // Functional modules
    AppMeasurementModule,
    AppSampleModule,
    AppObservedLocationOfflineModule,
    AppSelectObservedLocationsModalModule,
  ],
  declarations: [ImagineLandingsTable],
  exports: [
    // Components
    ImagineLandingsTable,
  ],
})
export class AppImagineLandingModule {
  constructor() {
    console.debug('[imagine-landing] Creating module...');
  }
}
