import { NgModule } from '@angular/core';
import { TripForm } from './trip.form';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { A11yModule } from '@angular/cdk/a11y';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppSocialModule } from '@app/social/social.module';

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
    AppVesselModule,
  ],
  declarations: [TripForm],
  exports: [
    // Components
    TripForm,
  ],
})
export class AppTripFormModule {
  constructor() {
    console.debug('[trip-form] Creating module...');
  }
}
