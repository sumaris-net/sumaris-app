import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppDataModule } from '@app/data/data.module';
import { ActivityMonthRowErrorPipe } from '@app/activity-calendar/calendar/activity-month.pipes';
import { AppCoreModule } from '@app/core/core.module';

@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // App module
    AppReferentialPipesModule,
    AppVesselModule,
    AppPmfmFormFieldModule,
    AppDataModule,
  ],
  declarations: [CalendarComponent, ActivityMonthRowErrorPipe],
  exports: [
    TranslateModule,

    // Components
    CalendarComponent,
  ],
})
export class AppCalendarModule {}
