import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { AppInboxMessageModule } from '@app/social/message/inbox-message.module';
import { AppCoreModule } from '@app/core/core.module';
import { InboxMessagesPage } from '@app/social/message/inbox-messages.page';

const routes: Routes = [
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

@NgModule({
  imports: [AppCoreModule, AppInboxMessageModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppInboxMessageRoutingModule {}
