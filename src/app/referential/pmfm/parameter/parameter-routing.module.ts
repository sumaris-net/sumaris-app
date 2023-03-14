import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
import { ParameterPage } from '@app/referential/pmfm/parameter/parameter.page';
import { AppPmfmParameterModule } from '@app/referential/pmfm/parameter/parameter.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: ParameterPage,
    data: {
      profile: 'ADMIN'
    }
  }
];

@NgModule({
  imports: [
    AppPmfmParameterModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppPmfmParameterRoutingModule { }
