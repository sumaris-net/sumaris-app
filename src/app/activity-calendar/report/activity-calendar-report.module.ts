import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { ActivityCalendarReport } from './activity-calendar.report';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SharedModule } from '@sumaris-net/ngx-components';

@NgModule({
  declarations: [ActivityCalendarReport],
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule, SharedModule],
  exports: [ActivityCalendarReport],
})
export class ActivityCalendarReportModule {}
