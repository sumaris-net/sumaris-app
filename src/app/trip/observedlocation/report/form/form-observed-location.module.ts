import { NgModule } from '@angular/core';
import { FormObservedLocationReport } from './form-observed-location.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';

@NgModule({
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule],
  declarations: [FormObservedLocationReport],
  exports: [FormObservedLocationReport],
})
export class FormObservedLocationReportModule {}
