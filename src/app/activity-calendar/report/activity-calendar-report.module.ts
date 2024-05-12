import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';

@NgModule({
  declarations: [],
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule],
  exports: [],
})
export class FormTripReportModule {}
