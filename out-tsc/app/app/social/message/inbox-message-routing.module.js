import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { AppInboxMessageModule } from '@app/social/message/inbox-message.module';
import { AppCoreModule } from '@app/core/core.module';
import { InboxMessagesPage } from '@app/social/message/inbox-messages.page';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
            profile: 'USER',
        },
        component: InboxMessagesPage,
    },
    {
        path: ':messageId',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsOrQueryParamsChange',
        data: {
            pathIdParam: 'messageId',
            profile: 'USER',
        },
        component: InboxMessagePage,
    },
];
let AppInboxMessageRoutingModule = class AppInboxMessageRoutingModule {
};
AppInboxMessageRoutingModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            AppInboxMessageModule,
            RouterModule.forChild(routes)
        ],
        exports: [
            RouterModule
        ]
    })
], AppInboxMessageRoutingModule);
export { AppInboxMessageRoutingModule };
//# sourceMappingURL=inbox-message-routing.module.js.map