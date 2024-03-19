import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { AppDataModule } from '../data/data.module';
import { AppReferentialModule } from '../referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { RxStateModule, SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppActivityCalendarPageModule } from '@app/activity-calendar/page/activity-calendar-page.module';
import { AppActivityCalendarsPageModule } from '@app/activity-calendar/table/activity-calendars-page.module';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    IonicModule,
    RxStateModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    AppVesselModule,
    AppExtractionButtonModule,

    // Sub modules
    AppActivityCalendarsPageModule,
    AppActivityCalendarPageModule,
  ],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    AppActivityCalendarsPageModule,
    AppActivityCalendarPageModule,
  ],
})
export class AppActivityCalendarModule {}
