import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { FormActivityCalendarReport } from './form-activity-calendar.report';

@NgModule({
  declarations: [FormActivityCalendarReport],
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule, SharedModule],
  exports: [FormActivityCalendarReport],
})
export class FormActivityCalendarReportModule {}
