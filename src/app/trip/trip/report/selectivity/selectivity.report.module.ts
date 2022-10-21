import { NgModule } from '@angular/core';

import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { ChartsModule } from 'ng2-charts';
import { SelectivityReport } from './selectivity.report';


@NgModule({
  declarations: [
    SelectivityReport
  ],
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppOperationModule,
    ChartsModule,
  ],
  exports: [
    SelectivityReport,
  ],
})
export class SelectivityReportModule { }
