import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { SoftwarePage } from '@app/referential/software/software.page';
import { AppSoftwareModule } from '@app/referential/software/software.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: SoftwarePage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'ADMIN',
      pathIdParam: 'id'
    }
  }
];

@NgModule({
  imports: [
    AppSoftwareModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppSoftwareRoutingModule { }
