import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { ObservedLocationFormReport } from './observed-location-form.report';
import { DenormalizedBatchModule } from '../../../denormalized-batch/denormalized-batch.module';

@NgModule({
  declarations: [ObservedLocationFormReport],
  exports: [ObservedLocationFormReport],
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule, DenormalizedBatchModule],
})
export class ObservedLocationFormReportModule {}
