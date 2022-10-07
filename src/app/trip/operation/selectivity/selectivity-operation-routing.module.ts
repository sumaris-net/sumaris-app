import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';

const routes: Routes = [
  {
    path: ':selectivityOperationId',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'selectivityOperationId'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: SelectivityOperationPage,
        canDeactivate: [ComponentDirtyGuard],
      },
    ],
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
export class AppSelectivityOperationRoutingModule {}
