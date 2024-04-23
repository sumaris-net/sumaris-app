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
import { CalendarAccordionComponent } from '@app/activity-calendar/calendar/accordion/calendar-accordion.component';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
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
  ],
  declarations: [CalendarComponent, CalendarAccordionComponent],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    CalendarComponent,
    CalendarAccordionComponent,
  ],
})
export class AppCalendarModule {}
