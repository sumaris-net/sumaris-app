import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { ActivityCalendarFormReport } from './activity-calendar-form.report';
import { ActivityCalendarFormsReport } from './activity-calendar-forms.report';

@NgModule({
  declarations: [ActivityCalendarFormReport, ActivityCalendarFormsReport],
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule, SharedModule],
  exports: [ActivityCalendarFormReport, ActivityCalendarFormsReport],
})
export class ActivityCalendarFormReportModule {}
