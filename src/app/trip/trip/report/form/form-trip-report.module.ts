import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { FormTripReport } from './form-trip.report';
import { AppDataModule } from '@app/data/data.module';

@NgModule({
  declarations: [FormTripReport],
  imports: [AppCoreModule, AppSharedReportModule, AppOperationModule, AppReferentialModule, AppDataModule],
  exports: [FormTripReport],
})
export class FormTripReportModule {}
