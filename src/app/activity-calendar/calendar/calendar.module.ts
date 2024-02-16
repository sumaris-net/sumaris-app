import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { ResizableModule } from 'angular-resizable-element';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';

@NgModule({
  imports: [SharedModule, CommonModule, IonicModule, TranslateModule.forChild(), ResizableModule, AppEntityQualityModule, AppReferentialPipesModule],
  declarations: [CalendarComponent],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    CalendarComponent,
  ],
})
export class AppCalendarModule {}
