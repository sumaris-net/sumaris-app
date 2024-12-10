import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';
import { AppSelectivityOperationModule } from '@app/trip/operation/selectivity/selectivity-operation.module';

const routes: Routes = [
  {
    path: ':selectivityOperationId',
    runGuardsAndResolvers: 'pathParamsChange',
    pathMatch: 'full',
    component: SelectivityOperationPage,
    canDeactivate: [ComponentDirtyGuard],
    data: {
      pathIdParam: 'selectivityOperationId',
    },
  },
];

@NgModule({
  imports: [AppSelectivityOperationModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppSelectivityOperationRoutingModule {}
