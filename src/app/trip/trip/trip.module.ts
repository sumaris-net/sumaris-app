import {NgModule} from '@angular/core';
import {TripTable} from './trips.table';
import {TripPage} from './trip.page';
import {TripForm} from './trip.form';
import {AppReferentialModule} from '@app/referential/referential.module';
import {AppDataModule} from '@app/data/data.module';
import {TranslateModule} from '@ngx-translate/core';
import {CommonModule} from '@angular/common';
import {TripTrashModal} from './trash/trip-trash.modal';
import {AppCoreModule} from '@app/core/core.module';
import {TripOfflineModal} from '@app/trip/trip/offline/trip-offline.modal';
import {A11yModule} from '@angular/cdk/a11y';
import {VesselModule} from '@app/vessel/vessel.module';
import {AppMeasurementModule} from '@app/data/measurement/measurement.module';
import {AppPhysicalGearModule} from '@app/trip/physicalgear/physical-gear.module';
import {AppOperationModule} from '@app/trip/operation/operation.module';
import {AppSaleModule} from '@app/trip/sale/sale.module';
import {AppSocialModule} from '@app/social/social.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    AppSocialModule,
    A11yModule,

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    VesselModule,

    // Functional modules
    AppMeasurementModule,
    AppPhysicalGearModule,
    AppOperationModule,
    AppSaleModule,
  ],
  declarations: [
    TripTable,
    TripForm,
    TripPage,
    TripTrashModal,
    TripOfflineModal
  ],
  exports: [
    // Components
    TripTable,
    TripPage,
    TripForm
  ]
})
export class AppTripModule {

  constructor() {
    console.debug('[trip] Creating module...');
  }
}
