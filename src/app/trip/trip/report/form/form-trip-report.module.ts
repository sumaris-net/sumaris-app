import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { FormTripReport } from './form-trip.report';
import { AppDataModule } from '@app/data/data.module';
import { DenormalizedBatchModule } from '@app/trip/denormalized-batch/denormalized-batch.module';
import { SampleFormReportComponent } from '@app/trip/sample/report/form/sample-form.report-component';
import { DenormalizedBatchFormReportComponent } from '@app/trip/denormalized-batch/report/form/denormalized-batch-form.report-component';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import { OperationFormReportComponent } from '@app/trip/operation/report/form/operation-form.report-component';

@NgModule({
  declarations: [FormTripReport],
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppOperationModule,
    AppReferentialModule,
    AppDataModule,
    DenormalizedBatchModule,
    ReportChunkModule,
    OperationFormReportComponent,
    SampleFormReportComponent,
    DenormalizedBatchFormReportComponent,
  ],
  exports: [FormTripReport],
})
export class FormTripReportModule {}
