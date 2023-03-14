import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
import { SoftwarePage } from '@app/referential/software/software.page';
import { AppSoftwareModule } from '@app/referential/software/software.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: SoftwarePage,
    data: {
      profile: 'ADMIN'
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
