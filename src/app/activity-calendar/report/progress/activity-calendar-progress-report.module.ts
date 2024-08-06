import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { ActivityCalendarProgressReport } from './activity-calendar-progress.report';
import { AppDataModule } from '@app/data/data.module';

@NgModule({
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialModule, AppDataModule, SharedModule],
  declarations: [ActivityCalendarProgressReport],
  exports: [ActivityCalendarProgressReport],
})
export class ActivityCalendarProgressReportModule {}
