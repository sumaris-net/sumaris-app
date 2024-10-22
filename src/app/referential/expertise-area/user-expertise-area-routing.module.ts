import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { UserExpertiseAreaPage } from '@app/referential/expertise-area/user-expertise-area.page';
import { AppUserExpertiseAreaModule } from '@app/referential/expertise-area/user-expertise-area.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: UserExpertiseAreaPage,
    data: {
      profile: 'ADMIN',
    },
  },
];

@NgModule({
  imports: [AppUserExpertiseAreaModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppUserExpertiseAreaRoutingModule {}
