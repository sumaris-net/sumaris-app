import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { PmfmPage } from './pmfm.page';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: PmfmPage,
    data: {
      profile: 'ADMIN'
    }
  }
];

@NgModule({
  imports: [
    AppPmfmModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppPmfmRoutingModule { }
