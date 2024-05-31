import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService, ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SalePage } from '@app/trip/sale/sale.page';

const routes: Routes = [
  {
    path: ':saleId',
    runGuardsAndResolvers: 'pathParamsChange',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
      pathIdParam: 'saleId',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        component: SalePage,
        canDeactivate: [ComponentDirtyGuard],
        data: {
          profile: 'USER',
          pathIdParam: 'saleId',
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppSalePageModule {}
