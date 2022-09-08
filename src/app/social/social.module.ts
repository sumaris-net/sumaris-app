import { SocialModule, UserEventModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { UserEventsTable } from '@app/social/user-event/user-events.table';
import { AppInboxMessageModule } from '@app/social/message/inbox-message.module';

@NgModule({
  imports: [
    AppCoreModule,
    SocialModule,
    UserEventModule
  ],
  declarations: [UserEventsTable],
  exports: [
    // Components
    UserEventsTable
  ]
})
export class AppSocialModule {
}
