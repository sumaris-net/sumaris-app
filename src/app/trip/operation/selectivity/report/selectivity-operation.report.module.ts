import { NgModule } from '@angular/core';

import { SelectivityOperationReport } from './selectivity-operation.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';


@NgModule({
  declarations: [
    SelectivityOperationReport,
  ],
  imports: [
    AppCoreModule,
    AppSharedReportModule,
  ],
  exports: [
    SelectivityOperationReport,
  ],
})
export class SelectivityOperationReportModule { }
