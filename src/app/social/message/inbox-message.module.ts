import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { NgxJdenticonModule } from 'ngx-jdenticon';
import { InboxMessagesPage } from '@app/social/message/inbox-messages.page';
import { SharedMarkdownModule, SocialModule } from '@sumaris-net/ngx-components';
import { AppUserEventModule } from '@app/social/user-event/user-event.module';

@NgModule({
  imports: [AppCoreModule, SocialModule, AppUserEventModule, NgxJdenticonModule, SharedMarkdownModule],
  declarations: [InboxMessagePage, InboxMessagesPage],
  exports: [
    // Components
    InboxMessagePage,
    InboxMessagesPage,
  ],
})
export class AppInboxMessageModule {}
