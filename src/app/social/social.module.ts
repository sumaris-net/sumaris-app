import { SocialModule, UserEventModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { AppJobReportModule } from '@app/social/job/report/job-report.module';
import { AppUserEventModule } from '@app/social/user-event/user-event.module';

@NgModule({
  imports: [
    AppCoreModule,
    SocialModule,
    UserEventModule,

    // Sub modules
    AppJobReportModule,
    AppUserEventModule
  ],
  exports: [
    // Sub modules
    AppJobReportModule,
    AppUserEventModule
  ]
})
export class AppSocialModule {
}
