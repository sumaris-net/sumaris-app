import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SalePage } from '@app/trip/sale/sale.page';

const routes: Routes = [
  {
    path: ':saleId',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'saleId',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: SalePage,
        canDeactivate: [ComponentDirtyGuard],
        data: {
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
