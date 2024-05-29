import { NgModule } from '@angular/core';
import { ToRegistrationCodeDirective, VesselForm } from './form/form-vessel';
import { VesselPage } from './page/vessel.page';
import { VesselsTable } from './list/vessels.table';
import { VesselModal } from './modal/vessel-modal';
import { VesselsPage } from './list/vessels.page';
import { TranslateModule } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { AppDataModule } from '../data/data.module';
import { VesselFeaturesHistoryComponent } from './page/vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from './page/vessel-registration-history.component';
import { AppReferentialModule } from '../referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { SelectVesselsModal } from '@app/vessel/modal/select-vessel.modal';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { VesselStatusToColorPipe } from '@app/vessel/status/vessel-status-to-color.pipe';
import { VesselOwnerHistoryComponent } from './page/vessel-owner-history.component';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    IonicModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
  ],
  declarations: [
    // Pipes
    VesselStatusToColorPipe,

    // Components
    VesselsTable,
    VesselPage,
    VesselsPage,
    VesselForm,
    VesselModal,
    VesselFeaturesHistoryComponent,
    VesselRegistrationHistoryComponent,
    VesselOwnerHistoryComponent,
    SelectVesselsModal,
    ToRegistrationCodeDirective,
  ],
  exports: [
    SharedModule,
    TranslateModule,

    // Pipes
    VesselStatusToColorPipe,

    // Components
    VesselFeaturesHistoryComponent,
    VesselRegistrationHistoryComponent,
    VesselOwnerHistoryComponent,
    VesselsTable,
    VesselPage,
    VesselsPage,
    VesselForm,
    VesselsPage,
  ],
})
export class AppVesselModule {}
