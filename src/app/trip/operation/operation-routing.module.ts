import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationPage } from './operation.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: 'selectivity',
    loadChildren: () => import('./selectivity/selectivity-operation-routing.module').then(m => m.AppSelectivityOperationRoutingModule)
  },
  {
    path: ':operationId',
    pathMatch: 'full',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'operationId'
    },
    component: OperationPage,
    canDeactivate: [ComponentDirtyGuard]
  }
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
