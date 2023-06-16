import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
import { TaxonGroupPage } from '@app/referential/taxon-group/taxon-group.page';
import { AppTaxonGroupModule } from '@app/referential/taxon-group/taxon-group.module';

const routes: Routes = [
  {
    path: ':id',
    pathMatch: 'full',
    component: TaxonGroupPage,
    data: {
      profile: 'ADMIN'
    }
  }
];

@NgModule({
  imports: [
    AppTaxonGroupModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppTaxonGroupRoutingModule { }
