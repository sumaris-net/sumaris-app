import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { AdvancedOperationPage } from '@app/trip/operation/advanced/advanced-operation.page';
import { AppAdvancedOperationModule } from '@app/trip/operation/advanced/advanced-operation.module';

const routes: Routes = [
  {
    path: ':advancedOperationId',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'advancedOperationId',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: AdvancedOperationPage,
        canDeactivate: [ComponentDirtyGuard],
        data: {
          pathIdParam: 'advancedOperationId',
        },
      },
    ],
  },
];

@NgModule({
  imports: [AppAdvancedOperationModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppAdvancedOperationRoutingModule {}
