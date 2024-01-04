import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppDataModule } from '../data/data.module';
import { AppReferentialModule } from '../referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { ActivityCalendarsPage } from '@app/activity-calendar/table/activity-calendars.page';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    IonicModule,
    TextMaskModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
  ],
  declarations: [ActivityCalendarsPage],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    ActivityCalendarsPage,
    // VesselPage,
    // VesselsPage,
    // VesselForm,
    // VesselsPage
  ],
})
export class VesselModule {}
