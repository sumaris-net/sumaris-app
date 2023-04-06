import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';
import { AppSelectivityOperationModule } from '@app/trip/operation/selectivity/selectivity-operation.module';

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
      // {
      //   path: 'report',
      //   loadChildren: () => import('@app/trip/trip/report/selectivity/selectivity-report-routing.module').then(m => m.SelectivityReportRoutingModule),
      // }
    ],
  }
];


@NgModule({
  imports: [
    AppSelectivityOperationModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppSelectivityOperationRoutingModule {}
