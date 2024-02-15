import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppDataModule } from '../data/data.module';
import { AppReferentialModule } from '../referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { ActivityCalendarsPage } from './activity-calendars.page';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { ActivityCalendarOfflineModal } from '@app/activity-calendar/offline/activity-calendar-offline.modal';
import { AppVesselModule } from '@app/vessel/vessel.module';

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
    AppVesselModule,
    AppExtractionButtonModule,
  ],
  declarations: [ActivityCalendarsPage, ActivityCalendarOfflineModal],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    ActivityCalendarsPage,
  ],
})
export class AppActivityCalendarModule {}
