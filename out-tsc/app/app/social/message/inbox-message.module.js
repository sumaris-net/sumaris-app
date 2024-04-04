import { __decorate } from "tslib";
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { NgxJdenticonModule } from 'ngx-jdenticon';
import { AppMarkdownModule } from '@app/shared/markdown/markdown.module';
import { InboxMessagesPage } from '@app/social/message/inbox-messages.page';
import { SocialModule } from '@sumaris-net/ngx-components';
import { AppUserEventModule } from '@app/social/user-event/user-event.module';
let AppInboxMessageModule = class AppInboxMessageModule {
};
AppInboxMessageModule = __decorate([
    NgModule({
        imports: [AppCoreModule, SocialModule, AppUserEventModule, NgxJdenticonModule, AppMarkdownModule],
        declarations: [InboxMessagePage, InboxMessagesPage],
        exports: [
            // Components
            InboxMessagePage,
            InboxMessagesPage,
        ],
    })
], AppInboxMessageModule);
export { AppInboxMessageModule };
//# sourceMappingURL=inbox-message.module.js.map