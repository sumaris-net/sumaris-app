import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppTableModule, SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { IfModule } from '@rx-angular/template/if';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    IonicModule,
    IfModule,
    TranslateModule.forChild(),
    AppEntityQualityModule,
    AppReferentialPipesModule,
    AppVesselModule,
    AppTableModule,
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
