import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationPage } from './operation.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: 'selectivity',
    loadChildren: () => import('./selectivity/selectivity-operation-routing.module').then((m) => m.AppSelectivityOperationRoutingModule),
  },
  {
    path: 'advanced',
    loadChildren: () => import('./advanced/advanced-operation-routing.module').then((m) => m.AppAdvancedOperationRoutingModule),
  },
  {
    path: ':operationId',
    runGuardsAndResolvers: 'pathParamsChange',
    pathMatch: 'full',
    component: OperationPage,
    canDeactivate: [ComponentDirtyGuard],
    data: {
      pathIdParam: 'operationId',
    },
  },
];


@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppOperationRoutingModule {
}
