import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AccountPage, AuthGuardService, ComponentDirtyGuard, HomePage, RegisterConfirmPage, SettingsPage, SharedRoutingModule } from '@sumaris-net/ngx-components';
import { QuicklinkModule, QuicklinkStrategy } from 'ngx-quicklink';
import { AppObservedLocationRoutingModule } from '@app/trip/observedlocation/observed-location-routing.module';
import { InboxMessagePage } from '@app/social/message/inbox-message.page';
import { AppInboxMessageModule } from '@app/social/message/inbox-message.module';
import { OperationPage } from '@app/trip/operation/operation.page';
import { AppCoreModule } from '@app/core/core.module';

const routes: Routes = [
  {
    path: ':messageId',
    pathMatch: 'full',
    runGuardsAndResolvers: 'pathParamsOrQueryParamsChange',
    data: {
      pathIdParam: 'messageId'
    },
    component: InboxMessagePage,
  }
];

@NgModule({
  imports: [
    AppCoreModule,
    AppInboxMessageModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppInboxMessageRoutingModule {
}
