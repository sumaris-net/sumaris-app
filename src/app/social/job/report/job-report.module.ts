import { SocialModule, UserEventModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { UserEventsTable } from '@app/social/user-event/user-events.table';
import { AppInboxMessageModule } from '@app/social/message/inbox-message.module';
import { JobReportModal } from '@app/social/job/report/job.report.modal';

@NgModule({
  imports: [
    AppCoreModule
  ],
  declarations: [JobReportModal],
  exports: [
    // Components
    JobReportModal
  ]
})
export class AppJobReportModule {
}
