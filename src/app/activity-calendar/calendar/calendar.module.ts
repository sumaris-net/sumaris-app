import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppTableModule, RxStateModule, SharedDebugModule, SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppVesselModule } from '@app/vessel/vessel.module';

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
  ],
  declarations: [CalendarComponent],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    CalendarComponent,
  ],
})
export class AppCalendarModule {}
