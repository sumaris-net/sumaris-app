import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppIconModule, AppTableModule, RxStateModule, SharedDebugModule, SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppDataModule } from '@app/data/data.module';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ActivityMonthRowErrorPipe } from '@app/activity-calendar/calendar/activity-month.pipes';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    ScrollingModule,
    IonicModule,
    RxStateModule,
    TranslateModule.forChild(),
    AppEntityQualityModule,
    AppReferentialPipesModule,
    AppVesselModule,
    AppTableModule,
    SharedDebugModule,
    AppPmfmFormFieldModule,
    AppIconModule,
    AppDataModule,
  ],
  declarations: [CalendarComponent, ActivityMonthRowErrorPipe],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    CalendarComponent,
  ],
})
export class AppCalendarModule {}
