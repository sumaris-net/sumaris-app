import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { TripReport } from './trip.report';


@NgModule({
  declarations: [
    TripReport,
  ],
  imports: [
    AppCoreModule,
  ],
  exports: [
    TripReport,
  ],
})
export class TripReportModule { }
