import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { MetierPage } from '@app/referential/metier/metier.page';
import { AppMetierModule } from '@app/referential/metier/metier.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: MetierPage,
    data: {
      profile: 'ADMIN',
    },
  },
];

@NgModule({
  imports: [AppMetierModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppMetierRoutingModule {}
