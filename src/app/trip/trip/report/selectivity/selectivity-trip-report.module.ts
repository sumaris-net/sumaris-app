import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { SelectivityTripReport } from '@app/trip/trip/report/selectivity/selectivity-trip.report';


@NgModule({
  declarations: [
    SelectivityTripReport
  ],
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppOperationModule
  ],
  exports: [
    SelectivityTripReport
  ],
})
export class SelectivityTripReportModule { }
