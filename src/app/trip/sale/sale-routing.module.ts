import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SalePage } from '@app/trip/sale/sale.page';
import { AppSaleModule } from '@app/trip/sale/sale.module';
import { LandingPage } from '@app/trip/landing/landing.page';

const routes: Routes = [
  {
    path: ':saleId',
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
  imports: [RouterModule.forChild(routes), AppSaleModule],
  exports: [RouterModule],
})
export class AppSaleRoutingModule {}
