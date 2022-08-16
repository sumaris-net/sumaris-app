import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppReferentialModule } from './referential.module';
import { PmfmStrategiesTableTestPage } from './strategy/sampling/testing/pmfm-strategies.table.test';

export const REFERENTIAL_TESTING_PAGES: TestingPage[] = [
  {label: 'Referential module', divider: true},
  {label: 'Pmfm Strategies Table', page: '/testing/referential/pmfmStrategiesTable'}
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'pmfmStrategiesTable'
  },
  {
    path: 'pmfmStrategiesTable',
    pathMatch: 'full',
    component: PmfmStrategiesTableTestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    AppReferentialModule,
  ],
  declarations: [
    PmfmStrategiesTableTestPage
  ],
  exports: [
    PmfmStrategiesTableTestPage
  ]
})
export class ReferentialTestingModule {

}
