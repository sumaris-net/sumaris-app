import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppTaxonNameModule } from '@app/referential/taxon-name/taxon-name.module';
import { TaxonNamePage } from '@app/referential/taxon-name/taxon-name.page';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: TaxonNamePage,
    data: {
      profile: 'ADMIN'
    }
  }
];

@NgModule({
  imports: [
    AppTaxonNameModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppTaxonNameRoutingModule { }
