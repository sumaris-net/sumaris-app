import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { TripReport } from './trip.report';
import { AppReferentialModule } from '@app/referential/referential.module';


@NgModule({
  declarations: [
    TripReport
  ],
  imports: [
    AppCoreModule,
    AppReferentialModule,
    AppSharedReportModule,
    AppOperationModule
  ],
  exports: [
    TripReport
  ],
})
export class TripReportModule { }
