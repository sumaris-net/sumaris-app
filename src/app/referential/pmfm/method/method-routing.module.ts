import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
import { MethodPage } from '@app/referential/pmfm/method/method.page';
import { AppPmfmMethodModule } from '@app/referential/pmfm/method/method.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: MethodPage,
    data: {
      profile: 'ADMIN'
    }
  }
];

@NgModule({
  imports: [
    AppPmfmMethodModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppPmfmMethodRoutingModule { }
