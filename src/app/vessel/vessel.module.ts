import { NgModule } from '@angular/core';
import { VesselForm } from './form/form-vessel';
import { VesselPage } from './page/vessel.page';
import { VesselsTable } from './list/vessels.table';
import { VesselModal } from './modal/vessel-modal';
import { VesselsPage } from './list/vessels.page';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppDataModule } from '../data/data.module';
import { VesselFeaturesHistoryComponent } from './page/vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from './page/vessel-registration-history.component';
import { AppReferentialModule } from '../referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
  ],
  declarations: [

    // Components
    VesselsTable,
    VesselPage,
    VesselsPage,
    VesselForm,
    VesselModal,
    VesselFeaturesHistoryComponent,
    VesselRegistrationHistoryComponent
  ],
  exports: [
    TranslateModule,

    // Components
    VesselsTable,
    VesselPage,
    VesselsPage,
    VesselForm,
    VesselsPage
  ]
})
export class VesselModule {
}
