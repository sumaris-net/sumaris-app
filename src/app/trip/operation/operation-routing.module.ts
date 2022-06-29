import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationPage } from './operation.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';

const routes: Routes = [
  {
    path: ':operationId',
    pathMatch: 'full',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'operationId'
    },
    component: OperationPage,
    canDeactivate: [ComponentDirtyGuard]
  },
  // {
  //   path: ':operationId/selectivity',
  //   pathMatch: 'full',
  //   runGuardsAndResolvers: 'pathParamsChange',
  //   data: {
  //     pathIdParam: 'operationId'
  //   },
  //   component: SelectivityOperationPage,
  //   canDeactivate: [ComponentDirtyGuard]
  // }
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
