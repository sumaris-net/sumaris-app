import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CommonModule} from '@angular/common';
import {CoreModule, SharedModule, TestingPage} from '@sumaris-net/ngx-components';
import {TranslateModule} from '@ngx-translate/core';
import {AppSharedReportModule} from '@app/shared/report/report.module';
import {ReportTestPage} from '@app/shared/report/testing/report.testing';
import {ChartsModule} from 'ng2-charts';

export const REFERENTIAL_TESTING_PAGES: TestingPage[] = [
  {label: 'Report', page: '/testing/shared/report'}
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ReportTestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    AppSharedReportModule,
    ChartsModule,
  ],
  declarations: [
    ReportTestPage
  ],
  exports: [
    ReportTestPage
  ]
})
export class AppSharedReportTestingModule {

}
