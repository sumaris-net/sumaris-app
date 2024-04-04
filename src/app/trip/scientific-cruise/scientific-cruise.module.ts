import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppSocialModule } from '@app/social/social.module';
import { A11yModule } from '@angular/cdk/a11y';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { ScientificCruiseTable } from '@app/trip/scientific-cruise/scientific-cruise.table';

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
    AppExtractionButtonModule,
  ],
  declarations: [ScientificCruiseTable],
  exports: [
    // Components
    ScientificCruiseTable,
  ],
})
export class AppScientificCruiseModule {
  constructor() {
    console.debug('[scientific-cruise] Creating module...');
  }
}
