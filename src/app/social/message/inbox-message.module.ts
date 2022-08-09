import { CoreModule, MessageModule, SocialModule, UserEventModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { NgxJdenticonModule } from 'ngx-jdenticon';

@NgModule({
  imports: [
    AppCoreModule,
    MessageModule,
    SocialModule,
    UserEventModule,
    NgxJdenticonModule
  ],
  declarations: [InboxMessagePage],
  exports: [
    // Components
    InboxMessagePage
  ]
})
export class AppInboxMessageModule {
}
