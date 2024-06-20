import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ActivityCalendarPage } from '@app/activity-calendar/page/activity-calendar.page';
import { AppActivityCalendarFormModule } from '@app/activity-calendar/form/activity-calendar-form.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppDataModule } from '@app/data/data.module';
import { AppCalendarModule } from '@app/activity-calendar/calendar/calendar.module';
import { AppActivityMapModule } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.module';
import { AngularSplitModule } from 'angular-split';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppGearPhysicalFeaturesTableModule } from '../metier/gear-physical-features.table.module';

@NgModule({
  imports: [
    TranslateModule.forChild(),
    // App modules
    AppCoreModule,
    AppDataModule,
    AppReferentialPipesModule,
    AppPmfmFormFieldModule,
    AppEntityQualityModule,
    AppGearPhysicalFeaturesTableModule,

    // Sub modules
    AppActivityCalendarFormModule,
    AppCalendarModule,
    AppVesselModule,
    AppActivityMapModule,
    AngularSplitModule,
  ],
  declarations: [ActivityCalendarPage],
  exports: [ActivityCalendarPage],
})
export class AppActivityCalendarPageModule {}
