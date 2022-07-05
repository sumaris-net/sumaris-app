import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppAuctionControlModule } from './auction-control.module';
import { AuctionControlPage } from './auction-control.page';
import { AuctionControlReport } from './auction-control.report';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: ':controlId',
    data: {
      profile: 'USER',
      pathIdParam: 'controlId'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        component: AuctionControlPage,
        canDeactivate: [ComponentDirtyGuard]
      },
      {
        path: 'report',
        component: AuctionControlReport
      }
    ]
  }
];


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppAuctionControlModule
  ],
  exports: [
    RouterModule
  ]
})
export class AppAuctionControlRoutingModule {
}
