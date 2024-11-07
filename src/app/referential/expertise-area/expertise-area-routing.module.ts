import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ExpertiseAreaPage } from '@app/referential/expertise-area/expertise-area.page';
import { AppExpertiseAreaModule } from '@app/referential/expertise-area/expertise-area.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: ExpertiseAreaPage,
    data: {
      profile: 'ADMIN',
    },
  },
];

@NgModule({
  imports: [AppExpertiseAreaModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppExpertiseAreaRoutingModule {}
