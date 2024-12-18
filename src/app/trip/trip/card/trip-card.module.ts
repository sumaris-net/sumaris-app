import { NgModule } from '@angular/core';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { A11yModule } from '@angular/cdk/a11y';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppSocialModule } from '@app/social/social.module';
import { TripCardComponent } from '@app/trip/trip/card/trip-card.component';
import { IonicModule } from '@ionic/angular';

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
    IonicModule,
  ],
  declarations: [TripCardComponent],
  exports: [
    // Components
    TripCardComponent,
  ],
})
export class AppTripCardModule {
  constructor() {
    console.debug('[trip] Creating card module...');
  }
}
