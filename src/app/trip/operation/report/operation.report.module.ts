import { NgModule } from '@angular/core';

import { OperationReport as OperationReport } from './operation.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';


@NgModule({
  declarations: [
    OperationReport,
  ],
  imports: [
    AppCoreModule,
    AppDataModule,
    AppSharedReportModule,
    AppReferentialModule,
  ],
  exports: [
    OperationReport,
  ],
})
export class OperationReportModule { }
